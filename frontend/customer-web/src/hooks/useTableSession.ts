import { useState, useEffect, useCallback } from 'react';

export const SESSION_STORAGE_KEY_BRANCH = 'customer_branch_id';
export const SESSION_STORAGE_KEY_TABLE = 'customer_table_id';

/**
 * Chuẩn hóa mã bàn để đồng bộ 100% với sơ đồ bàn bên POS (1..20):
 * - "01", "B01", "b1", "1" -> "1"
 * - "B12", "12" -> "12"
 * - Các mã đặc biệt khác (VD: "VIP1") giữ nguyên
 */
export function normalizeTableId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^b?0*(\d+)$/i);
  if (match && match[1]) {
    return String(parseInt(match[1], 10));
  }
  return trimmed;
}

/**
 * Định dạng nhãn bàn hiển thị thân thiện trên giao diện (VD: "1" -> "B01", "12" -> "B12")
 */
export function formatTableBadge(tableId: string): string {
  const trimmed = (tableId || '').trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return `B${String(num).padStart(2, '0')}`;
  }
  return trimmed.toUpperCase();
}

/**
 * Đọc trực tiếp thông tin bàn & chi nhánh từ sessionStorage (dùng khi tạo đơn POST /orders)
 */
export function getStoredTableSession(): { branchId: string; tableId: string } {
  try {
    const tableId = sessionStorage.getItem(SESSION_STORAGE_KEY_TABLE) || '';
    const branchId = sessionStorage.getItem(SESSION_STORAGE_KEY_BRANCH) || '1';
    return {
      tableId: normalizeTableId(tableId),
      branchId: branchId.trim() || '1',
    };
  } catch {
    return { branchId: '1', tableId: '' };
  }
}

/**
 * Bắt tham số tableId (hoặc table) và branchId (hoặc branch) từ URL:
 * Hỗ trợ:
 * - /?tableId=1 hoặc /?tableId=B01
 * - /?table=5&branchId=1
 * - /table/5 hoặc /table/B05
 */
export function parseTableFromUrl(): { branchId: string; tableId: string } | null {
  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    let rawTable = searchParams.get('tableId') || searchParams.get('table') || '';
    const rawBranch = searchParams.get('branchId') || searchParams.get('branch') || '';

    const pathMatch = url.pathname.match(/\/table\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      rawTable = decodeURIComponent(pathMatch[1]);
    }

    const cleanTableId = normalizeTableId(rawTable);
    if (cleanTableId) {
      return {
        tableId: cleanTableId,
        branchId: (rawBranch || '1').trim(),
      };
    }
  } catch (e) {
    console.warn('Could not parse table info from URL:', e);
  }

  return null;
}

export function useTableSession() {
  const [branchId, setBranchId] = useState<string>(() => {
    const fromUrl = parseTableFromUrl();
    if (fromUrl?.branchId) return fromUrl.branchId;
    return getStoredTableSession().branchId;
  });

  const [tableId, setTableId] = useState<string>(() => {
    const fromUrl = parseTableFromUrl();
    if (fromUrl?.tableId) return fromUrl.tableId;
    return getStoredTableSession().tableId;
  });

  const setTableSession = useCallback((newBranchId: string, newTableId: string, syncUrl = true) => {
    const cleanBranch = (newBranchId || '1').trim();
    const cleanTable = normalizeTableId(newTableId);
    if (!cleanTable) return;

    setBranchId(cleanBranch);
    setTableId(cleanTable);

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY_BRANCH, cleanBranch);
      sessionStorage.setItem(SESSION_STORAGE_KEY_TABLE, cleanTable);
      // Dọn key cũ trong localStorage nếu có để tránh xung đột phiên cũ
      localStorage.removeItem(SESSION_STORAGE_KEY_TABLE);
    } catch (e) {
      console.warn('Could not save table session to sessionStorage:', e);
    }

    if (syncUrl) {
      const targetSearch = `?tableId=${encodeURIComponent(cleanTable)}${cleanBranch !== '1' ? `&branchId=${encodeURIComponent(cleanBranch)}` : ''}`;
      if (window.location.search !== targetSearch) {
        window.history.replaceState(
          { tableId: cleanTable, branchId: cleanBranch },
          '',
          `/${targetSearch}`
        );
      }
    }
  }, []);

  const clearTableSession = useCallback(() => {
    setTableId('');
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY_TABLE);
      localStorage.removeItem(SESSION_STORAGE_KEY_TABLE);
    } catch (e) {
      console.warn('Could not clear sessionStorage:', e);
    }
    if (window.location.search || window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Đồng bộ URL -> sessionStorage ngay khi truy cập hoặc điều hướng Back/Forward
  useEffect(() => {
    const syncFromUrlOrStorage = () => {
      const urlInfo = parseTableFromUrl();
      if (urlInfo?.tableId) {
        setTableSession(urlInfo.branchId, urlInfo.tableId, false);
      } else {
        const stored = getStoredTableSession();
        if (stored.tableId) {
          setBranchId(stored.branchId);
          setTableId(stored.tableId);
        }
      }
    };

    syncFromUrlOrStorage();
    window.addEventListener('popstate', syncFromUrlOrStorage);
    return () => window.removeEventListener('popstate', syncFromUrlOrStorage);
  }, [setTableSession]);

  return {
    branchId,
    tableId,
    tableBadge: formatTableBadge(tableId),
    hasTable: Boolean(tableId),
    setTableSession,
    clearTableSession,
  };
}

