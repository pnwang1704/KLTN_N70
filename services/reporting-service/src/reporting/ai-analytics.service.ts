import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { AiReportCache } from './entities/ai-report-cache.entity';
import { ReportingService, type ReportFilterQuery } from './reporting.service';

export interface AiSummaryRequest extends ReportFilterQuery {
  forceRefresh?: boolean;
}

export interface AiChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AiChatRequest extends ReportFilterQuery {
  question: string;
  history?: AiChatMessage[];
}

export interface AiSummaryResult {
  overview: string;
  highlights: string[];
  warnings: string[];
  actionableTips: string[];
  source: 'gemini' | 'smart-fallback';
  model: string;
  cached?: boolean;
  generatedAt: string;
  notice?: string;
}

function formatVnd(amount: number): string {
  return `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;
}

@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);

  constructor(
    @InjectRepository(AiReportCache)
    private readonly cacheRepository: Repository<AiReportCache>,
    private readonly reportingService: ReportingService,
  ) {}

  private getGeminiClient(): { client: GoogleGenAI | null; models: string[] } {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const primary = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
    const models = Array.from(
      new Set([primary, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']),
    );
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return { client: null, models };
    }
    return { client: new GoogleGenAI({ apiKey }), models };
  }

  private async generateWithFallback(
    client: GoogleGenAI,
    models: string[],
    prompt: string,
    jsonMode = false,
  ): Promise<{ text: string; model: string }> {
    let lastError: any = null;
    for (const model of models) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: jsonMode
            ? { responseMimeType: 'application/json', temperature: 0.4 }
            : { temperature: 0.4 },
        });
        const text = (response.text || '').trim();
        if (text) {
          return { text, model };
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini model ${model} failed: ${err?.message}`);
      }
    }
    throw lastError || new Error('All Gemini models failed');
  }

  private async gatherReportContext(query: ReportFilterQuery) {
    const [overview, paymentMethods, topProducts, peakHours, branchesComparison] =
      await Promise.all([
        this.reportingService.getOverview(query),
        this.reportingService.getPaymentMethods(query),
        this.reportingService.getTopProducts(query),
        this.reportingService.getPeakHours(query),
        this.reportingService.getBranchesComparison(query),
      ]);

    return {
      filter: {
        branchId: query.branchId || 'ALL',
        startDate: overview.startDate,
        endDate: overview.endDate,
      },
      overview,
      paymentMethods,
      topProducts,
      peakHours: peakHours.filter((h) => h.orders > 0),
      quietHours: peakHours.filter((h) => h.orders === 0).map((h) => h.label),
      branchesComparison,
    };
  }

  private buildFallbackSummary(context: any, notice?: string): AiSummaryResult {
    const ov = context.overview;
    const top1 = context.topProducts?.[0];
    const top2 = context.topProducts?.[1];
    const bestBranch = context.branchesComparison?.[0];
    const peak = [...(context.peakHours || [])].sort((a, b) => b.orders - a.orders)[0];
    const totalAll = (ov.totalOrders || 0) + (ov.voidedCount || 0);
    const cancelRate = totalAll > 0 ? Number(((ov.voidedCount / totalAll) * 100).toFixed(1)) : 0;

    const overviewText =
      ov.totalOrders > 0
        ? `Trong kỳ ${ov.startDate} → ${ov.endDate}, hệ thống ghi nhận ${ov.totalOrders} đơn hoàn tất với doanh thu thực thu ${formatVnd(ov.netRevenue)}, giá vốn nguyên liệu ước tính ${formatVnd(ov.estimatedCogs)} và lợi nhuận gộp đạt ${formatVnd(ov.grossProfit)} (biên lợi nhuận ${ov.grossMarginPercent}%). Giá trị trung bình mỗi đơn (AOV) đạt ${formatVnd(ov.aov)}.`
        : `Trong kỳ ${ov.startDate} → ${ov.endDate}, chưa ghi nhận đơn hàng đã thanh toán nào ở phạm vi chi nhánh đang chọn.`;

    const highlights: string[] = [];
    if (top1) {
      highlights.push(
        `Món chủ lực "${top1.productName}" dẫn đầu với ${top1.quantity} phần bán ra, đóng góp ${formatVnd(top1.revenue)} doanh thu (${formatVnd(top1.profit)} lợi nhuận gộp).`,
      );
    }
    if (ov.grossMarginPercent >= 45) {
      highlights.push(
        `Biên lợi nhuận gộp đạt ${ov.grossMarginPercent}% — mức sinh lời tốt cho mô hình F&B, cho thấy kiểm soát giá vốn định lượng (BOM) hiệu quả.`,
      );
    }
    if (bestBranch && bestBranch.netRevenue > 0) {
      highlights.push(
        `${bestBranch.branchName} (${bestBranch.branchCode}) dẫn đầu chuỗi với ${formatVnd(bestBranch.netRevenue)} doanh thu và ${bestBranch.totalOrders} đơn hàng.`,
      );
    }
    if (peak) {
      highlights.push(
        `Khung giờ cao điểm nhất là ${peak.label} với ${peak.orders} đơn (${formatVnd(peak.revenue)}).`,
      );
    }
    if (highlights.length === 0) {
      highlights.push('Hệ thống báo cáo và định lượng nguyên liệu (BOM) đã sẵn sàng ghi nhận dữ liệu thời gian thực.');
    }

    const warnings: string[] = [];
    if (ov.voidedCount > 0) {
      warnings.push(
        `Phát sinh ${ov.voidedCount} đơn Hủy/Void (tỷ lệ ${cancelRate}%), tổng giá trị thất thoát ${formatVnd(ov.voidedAmount)} (${ov.cancelledCount} hủy chưa TT, ${ov.paidVoidedCount} void bill). Cần kiểm tra lý do hủy của thu ngân.`,
      );
    }
    const zeroBranch = (context.branchesComparison || []).find((b: any) => b.totalOrders === 0);
    if (zeroBranch && context.filter.branchId === 'ALL') {
      warnings.push(
        `${zeroBranch.branchName} (${zeroBranch.branchCode}) chưa phát sinh doanh thu trong kỳ này — cần kiểm tra tình trạng vận hành hoặc đẩy mạnh truyền thông địa phương.`,
      );
    }
    if ((context.quietHours || []).length >= 8) {
      warnings.push(
        `Nhiều khung giờ thấp điểm chưa có đơn hàng (ví dụ: ${(context.quietHours || []).slice(0, 4).join(', ')}). Có thể tối ưu lịch nhân sự theo khung giờ.`,
      );
    }
    if (warnings.length === 0) {
      warnings.push('Chưa phát hiện cảnh báo rủi ro lớn về tỷ lệ hủy đơn hay biên lợi nhuận trong kỳ này.');
    }

    const actionableTips: string[] = [
      top1 && top2
        ? `Tạo Combo bán chéo "${top1.productName} + ${top2.productName}" giảm 10% để nâng giá trị trung bình đơn (AOV hiện tại: ${formatVnd(ov.aov)}).`
        : 'Thiết kế combo Đồ uống + Đồ ăn vặt vào giờ thấp điểm (14h–17h) để tăng AOV thêm 15–20%.',
      peak
        ? `Bố trí tăng cường nhân sự pha chế và chuẩn bị sẵn topping trước khung giờ cao điểm ${peak.label} nhằm rút ngắn thời gian ra món trên KDS.`
        : 'Rà soát tồn kho nguyên liệu chủ lực (Cà phê, Sữa, Trà) trước giờ mở cửa để tránh đứt hàng.',
      ov.voidedCount > 0
        ? 'Rà soát log Hủy/Void bill theo ca trực và yêu cầu xác nhận mã PIN quản lý chặt chẽ với mọi giao dịch hủy sau thanh toán.'
        : 'Kích hoạt chương trình ưu đãi thanh toán không tiền mặt (VietQR) và đặt QR gọi món tại bàn để tăng tốc độ phục vụ.',
    ];

    return {
      overview: overviewText,
      highlights: highlights.slice(0, 4),
      warnings: warnings.slice(0, 3),
      actionableTips: actionableTips.slice(0, 3),
      source: 'smart-fallback',
      model: 'local-fnb-analyzer',
      generatedAt: new Date().toISOString(),
      notice,
    };
  }

  async generateAiSummary(req: AiSummaryRequest): Promise<AiSummaryResult> {
    const context = await this.gatherReportContext(req);
    const cacheKey = `${context.filter.branchId}_${context.filter.startDate}_${context.filter.endDate}`;

    if (!req.forceRefresh) {
      try {
        const cachedRow = await this.cacheRepository.findOne({ where: { cacheKey } });
        if (cachedRow) {
          const ageMs = Date.now() - new Date(cachedRow.updatedAt || cachedRow.createdAt).getTime();
          const sixHoursMs = 6 * 60 * 60 * 1000;
          if (ageMs < sixHoursMs) {
            const parsed = JSON.parse(cachedRow.summaryContent) as AiSummaryResult;
            return { ...parsed, cached: true };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Cache lookup failed: ${err?.message}`);
      }
    }

    const { client, models } = this.getGeminiClient();
    let result: AiSummaryResult;

    if (!client) {
      result = this.buildFallbackSummary(
        context,
        'Chưa cấu hình GEMINI_API_KEY — đang hiển thị phân tích tự động từ số liệu thực tế. Thêm GEMINI_API_KEY vào .env để bật Google Gemini AI.',
      );
    } else {
      try {
        const prompt = `Bạn là Chuyên gia Phân tích Vận hành Chuỗi F&B (Cà phê & Trà sữa) cấp cao.
Dưới đây là dữ liệu thống kê kinh doanh thực tế của hệ thống POS N70 (đơn vị tiền tệ: VNĐ):
${JSON.stringify(context, null, 2)}

Hãy phân tích sâu, súc tích, có dẫn chứng con số cụ thể bằng tiếng Việt và trả về DUY NHẤT một JSON hợp lệ (không bọc markdown code block) theo đúng schema sau:
{
  "overview": "Đoạn nhận xét tổng quan ngắn gọn 2-3 câu kèm số liệu nổi bật.",
  "highlights": ["Điểm sáng 1 kèm số liệu", "Điểm sáng 2 kèm số liệu", "Điểm sáng 3"],
  "warnings": ["Cảnh báo rủi ro 1 (VD: tỷ lệ hủy đơn, chi nhánh thấp, khung giờ vắng)", "Cảnh báo 2"],
  "actionableTips": ["Gợi ý hành động thực tế 1", "Gợi ý hành động thực tế 2", "Gợi ý hành động thực tế 3"]
}`;

        const { text: rawText, model: usedModel } = await this.generateWithFallback(
          client,
          models,
          prompt,
          true,
        );
        const cleaned = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        result = {
          overview: String(parsed.overview || ''),
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
          actionableTips: Array.isArray(parsed.actionableTips)
            ? parsed.actionableTips.map(String).slice(0, 3)
            : [],
          source: 'gemini',
          model: usedModel,
          cached: false,
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        this.logger.error(`Gemini AI summary error: ${err?.message}`);
        result = this.buildFallbackSummary(
          context,
          `Không thể gọi Google Gemini API (${err?.message || 'lỗi kết nối'}) — đang hiển thị phân tích tự động từ số liệu thực tế.`,
        );
      }
    }

    // Only cache successful Gemini results in Neon reporting_db (never cache transient errors)
    if (result.source === 'gemini') {
      try {
        const existing = await this.cacheRepository.findOne({ where: { cacheKey } });
        if (existing) {
          existing.summaryContent = JSON.stringify(result);
          await this.cacheRepository.save(existing);
        } else {
          await this.cacheRepository.save(
            this.cacheRepository.create({
              cacheKey,
              summaryContent: JSON.stringify(result),
            }),
          );
        }
      } catch (err: any) {
        this.logger.warn(`Could not save AiReportCache: ${err?.message}`);
      }
    }

    return { ...result, cached: false };
  }

  private buildFallbackChatAnswer(question: string, context: any): string {
    const q = question.toLowerCase();
    const ov = context.overview;
    const branches = context.branchesComparison || [];
    const top = context.topProducts || [];
    const peaks = [...(context.peakHours || [])].sort((a, b) => b.orders - a.orders);

    if (q.includes('chi nhánh') || q.includes('hiệu quả')) {
      if (branches.length === 0) return 'Hiện chưa có dữ liệu so sánh giữa các chi nhánh trong kỳ lọc.';
      const best = branches[0];
      const others = branches
        .slice(1)
        .map((b: any) => `${b.branchName}: ${formatVnd(b.netRevenue)} (${b.totalOrders} đơn, tỷ lệ hủy ${b.cancelRate}%)`)
        .join('; ');
      return `🏆 **${best.branchName} (${best.branchCode})** đang hoạt động hiệu quả nhất với doanh thu **${formatVnd(best.netRevenue)}**, **${best.totalOrders} đơn**, lợi nhuận gộp **${formatVnd(best.grossProfit)}** và tỷ lệ hủy **${best.cancelRate}%**.${others ? `\n\nCác chi nhánh còn lại: ${others}.` : ''}`;
    }

    if (q.includes('hủy') || q.includes('void') || q.includes('thất thoát')) {
      const totalAll = (ov.totalOrders || 0) + (ov.voidedCount || 0);
      const rate = totalAll > 0 ? ((ov.voidedCount / totalAll) * 100).toFixed(1) : '0';
      return `⚠️ Trong kỳ ${ov.startDate} → ${ov.endDate}, hệ thống ghi nhận **${ov.voidedCount} đơn Hủy/Void** (chiếm **${rate}%** tổng đơn), tương đương **${formatVnd(ov.voidedAmount)}** (${ov.cancelledCount} đơn hủy trước thanh toán, ${ov.paidVoidedCount} hóa đơn void sau thanh toán). Bạn nên vào mục **Sửa / Hủy Hóa Đơn** để kiểm tra chi tiết lý do hủy từng đơn và nhắc thu ngân xác nhận kỹ trước khi gửi bếp.`;
    }

    if (q.includes('combo') || q.includes('món') || q.includes('bán chạy')) {
      if (top.length === 0) return 'Chưa có dữ liệu món bán chạy trong kỳ lọc này.';
      const topList = top
        .slice(0, 3)
        .map((p: any, i: number) => `${i + 1}. **${p.productName}** (${p.quantity} ly/phần — ${formatVnd(p.revenue)})`)
        .join('\n');
      return `🥤 Top món bán chạy nhất kỳ này:\n${topList}\n\n💡 **Gợi ý Combo:** Kết hợp **${top[0].productName}** với ${top[1] ? `**${top[1].productName}** hoặc một món ăn vặt` : 'một món ăn vặt'} giảm 10–15% để kéo AOV (hiện tại ${formatVnd(ov.aov)}) lên mức cao hơn.`;
    }

    if (q.includes('giờ') || q.includes('cao điểm')) {
      if (peaks.length === 0) return 'Chưa có dữ liệu khung giờ bán hàng trong kỳ lọc.';
      return `⏰ Khung giờ cao điểm nhất là **${peaks[0].label}** với **${peaks[0].orders} đơn** (${formatVnd(peaks[0].revenue)}). Bạn nên chuẩn bị sẵn nguyên liệu và bố trí đủ nhân sự pha chế trước khung giờ này.`;
    }

    return `📊 Tóm tắt kỳ **${ov.startDate} → ${ov.endDate}**: Doanh thu thực thu **${formatVnd(ov.netRevenue)}** (${ov.totalOrders} đơn, AOV ${formatVnd(ov.aov)}), giá vốn BOM **${formatVnd(ov.estimatedCogs)}**, lợi nhuận gộp **${formatVnd(ov.grossProfit)}** (${ov.grossMarginPercent}%), đơn hủy/void **${ov.voidedCount} đơn** (${formatVnd(ov.voidedAmount)}). (Gợi ý: Cấu hình GEMINI_API_KEY trong .env để mở khóa hội thoại tự nhiên với Google Gemini!)`;
  }

  async chatWithAi(req: AiChatRequest): Promise<{
    answer: string;
    source: 'gemini' | 'smart-fallback';
    model: string;
    answeredAt: string;
  }> {
    const question = (req.question || '').trim();
    if (!question) {
      return {
        answer: 'Vui lòng nhập câu hỏi về số liệu kinh doanh để trợ lý AI hỗ trợ bạn.',
        source: 'smart-fallback',
        model: 'local-fnb-analyzer',
        answeredAt: new Date().toISOString(),
      };
    }

    const context = await this.gatherReportContext(req);
    const { client, models } = this.getGeminiClient();

    if (!client) {
      return {
        answer: this.buildFallbackChatAnswer(question, context),
        source: 'smart-fallback',
        model: 'local-fnb-analyzer',
        answeredAt: new Date().toISOString(),
      };
    }

    try {
      const historyText = (req.history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Chủ quán' : 'Trợ lý AI'}: ${m.content}`)
        .join('\n');

      const prompt = `Bạn là Trợ lý AI Copilot chuyên phân tích kinh doanh cho chủ chuỗi quán Cà phê / Trà sữa N70 POS.
Hãy trả lời câu hỏi của chủ quán bằng tiếng Việt tự nhiên, ngắn gọn (tối đa 4-6 dòng), trực diện, luôn dẫn chứng số liệu chính xác từ dữ liệu JSON bên dưới (đơn vị VNĐ). Không bịa đặt số liệu ngoài JSON.

DỮ LIỆU KỲ BÁO CÁO HIỆN TẠI:
${JSON.stringify(context, null, 2)}

${historyText ? `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n${historyText}\n` : ''}
CÂU HỎI MỚI CỦA CHỦ QUÁN:
${question}`;

      const { text: answer, model: usedModel } = await this.generateWithFallback(
        client,
        models,
        prompt,
        false,
      );

      return {
        answer: answer || this.buildFallbackChatAnswer(question, context),
        source: 'gemini',
        model: usedModel,
        answeredAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Gemini AI chat error: ${err?.message}`);
      return {
        answer: this.buildFallbackChatAnswer(question, context),
        source: 'smart-fallback',
        model: 'local-fnb-analyzer',
        answeredAt: new Date().toISOString(),
      };
    }
  }
}
