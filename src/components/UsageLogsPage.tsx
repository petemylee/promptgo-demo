'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Role = 'Requester' | 'Driver' | 'Admin' | 'Executive';
type UsageLogAction =
  | 'PAGE_VIEW'
  | 'API_CALL'
  | 'AUTH'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'OTHER';

type UsageLogItem = {
  id: string;
  createdAt: string;
  action: UsageLogAction;
  path: string;
  role: Role | null;
  entityType: string | null;
  entityId: string | null;
  message: string | null;
  user: { id: string; name: string | null; email: string; role: Role; position: string | null } | null;
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function roleLabel(role: Role | null) {
  switch (role) {
    case 'Admin':
      return 'แอดมิน';
    case 'Executive':
      return 'ผู้บริหาร';
    case 'Driver':
      return 'พนักงานขับรถ';
    case 'Requester':
      return 'ผู้ขอใช้รถ';
    default:
      return '-';
  }
}

function actionLabel(action: UsageLogAction) {
  switch (action) {
    case 'PAGE_VIEW':
      return 'เปิดหน้า/เมนู';
    case 'API_CALL':
      return 'เรียกใช้งานระบบ';
    case 'AUTH':
      return 'เข้าสู่ระบบ';
    case 'CREATE':
      return 'สร้างข้อมูล';
    case 'UPDATE':
      return 'แก้ไขข้อมูล';
    case 'DELETE':
      return 'ลบข้อมูล';
    case 'EXPORT':
      return 'ส่งออกข้อมูล';
    default:
      return 'อื่นๆ';
  }
}

function simplifyPath(path: string) {
  const p = path || '/';
  if (p === '/admin/usage-logs' || p === '/executive/usage-logs') return 'Usage Logs';
  if (p === '/admin/dashboard') return 'แดชบอร์ด (แอดมิน)';
  if (p === '/executive') return 'แดชบอร์ด (ผู้บริหาร)';
  if (p.startsWith('/admin/users')) return 'จัดการผู้ใช้';
  if (p.startsWith('/admin/vehicles')) return 'จัดการรถยนต์';
  if (p.startsWith('/admin/history')) return 'ประวัติการอนุมัติ';
  if (p.startsWith('/admin/my-bookings')) return 'รายการจองของฉัน (แอดมิน)';
  if (p.startsWith('/executive/admin-approvals')) return 'อนุมัติและจัดสรรรถยนต์';
  if (p.startsWith('/executive/approvals')) return 'รอยืนยัน';
  if (p.startsWith('/executive/history')) return 'ประวัติการยืนยัน';
  if (p.startsWith('/executive/my-bookings')) return 'รายการจองของฉัน (ผู้บริหาร)';
  if (p === '/api/usage-logs') return 'รายงานประวัติการใช้งาน';
  if (p.startsWith('/api/')) return 'การทำงานของระบบ (API)';
  if (p.startsWith('/admin')) return 'ส่วนแอดมิน';
  if (p.startsWith('/executive')) return 'ส่วนผู้บริหาร';
  return p;
}

function ActionPill({ action }: { action: UsageLogAction }) {
  const cls =
    action === 'PAGE_VIEW'
      ? 'bg-sky-50 text-sky-700 ring-sky-200'
      : action === 'API_CALL'
        ? 'bg-violet-50 text-violet-700 ring-violet-200'
        : action === 'AUTH'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : action === 'CREATE'
            ? 'bg-green-50 text-green-700 ring-green-200'
            : action === 'UPDATE'
              ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : action === 'DELETE'
                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                : action === 'EXPORT'
                  ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                  : 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {actionLabel(action)}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
      <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
      <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
      <div className="col-span-6 h-4 animate-pulse rounded bg-slate-200" />
      <div className="col-span-2 h-4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function UsageLogsPage({ title }: { title: string }) {
  const [items, setItems] = useState<UsageLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [take, setTake] = useState(50);
  const [action, setAction] = useState<UsageLogAction | ''>('');
  const [path, setPath] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [showSystemLogs, setShowSystemLogs] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('take', String(take));
    if (action) p.set('action', action);
    if (path.trim()) p.set('path', path.trim());
    if (userQuery.trim()) p.set('user', userQuery.trim());
    return p.toString();
  }, [take, action, path, userQuery]);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const url = new URL('/api/usage-logs', window.location.origin);
      const qp = new URLSearchParams(query);
      if (cursor) qp.set('cursor', cursor);
      url.search = qp.toString();

      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { items: UsageLogItem[]; nextCursor: string | null };
      const filtered = showSystemLogs ? data.items : data.items.filter((x) => x.action !== 'API_CALL');
      setItems((prev) => (append ? [...prev, ...filtered] : filtered));
      setNextCursor(data.nextCursor);
    },
    [query, showSystemLogs]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(null, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  const onLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextCursor, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลเพิ่มไม่สำเร็จ');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">ดูประวัติการใช้งานระบบ</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center rounded-2xl bg-[#004c80] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003a63] active:bg-[#003252] transition-colors"
          >
            รีเฟรช
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700">ประเภทกิจกรรม</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[#004c80]"
              >
                <option value="">ทั้งหมด</option>
                <option value="PAGE_VIEW">เปิดหน้า/เมนู</option>
                <option value="API_CALL">เรียกใช้งานระบบ</option>
                <option value="AUTH">เข้าสู่ระบบ</option>
                <option value="CREATE">สร้างข้อมูล</option>
                <option value="UPDATE">แก้ไขข้อมูล</option>
                <option value="DELETE">ลบข้อมูล</option>
                <option value="EXPORT">ส่งออกข้อมูล</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>
            <div className="md:col-span-9">
              <label className="block text-xs font-semibold text-slate-700">ค้นหาจากหน้า/เมนู</label>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="เช่น อนุมัติ, จัดการผู้ใช้, ประวัติ, dashboard"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[#004c80]"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">เปลี่ยนตัวกรองแล้วระบบจะโหลดใหม่อัตโนมัติ</p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showSystemLogs}
                  onChange={(e) => setShowSystemLogs(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#004c80] focus:ring-[#004c80]"
                />
                แสดง log ระบบ (สำหรับทีม IT)
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                setAction('');
                setPath('');
                setUserQuery('');
                setTake(50);
              }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              ล้างตัวกรอง
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-slate-700">ผู้ใช้ (ชื่อหรืออีเมล)</label>
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="เช่น Somchai หรือ somchai@company.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[#004c80]"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700">จำนวนต่อหน้า</label>
              <select
                value={take}
                onChange={(e) => setTake(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-[#004c80]"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
              ไม่พบข้อมูล log
            </div>
          ) : (
            items.map((it) => (
              <details
                key={it.id}
                className="group rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
              >
                <summary className="cursor-pointer list-none">
                  <div className="grid grid-cols-12 items-center gap-3">
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-xs font-semibold text-slate-700">{fmtDateTime(it.createdAt)}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {it.user ? (
                          <>
                            <span className="font-semibold">{it.user.name || it.user.email}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                              {roleLabel(it.user.role)}
                            </span>
                            {it.user.position ? <span className="ml-2 text-slate-500">{it.user.position}</span> : null}
                          </>
                        ) : (
                          <span className="italic text-slate-500">ไม่พบข้อมูลผู้ใช้</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <ActionPill action={it.action} />
                      <div className="mt-2 text-xs text-slate-600">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">บันทึกเหตุการณ์</span>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-sm font-semibold text-slate-900">{simplifyPath(it.path)}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {it.message ? (
                          <span>{it.message}</span>
                        ) : it.entityType || it.entityId ? (
                          <span>
                            รายการ: {it.entityType || '-'} {it.entityId ? `(${it.entityId})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-1 text-right">
                      <span className="text-xs font-semibold text-[#004c80] group-open:hidden">ดูรายละเอียด</span>
                      <span className="text-xs font-semibold text-slate-600 hidden group-open:inline">ย่อ</span>
                    </div>
                  </div>
                </summary>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <h3 className="text-xs font-bold text-slate-800">สรุปรายละเอียด</h3>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-600">หน้า/เมนู:</span> {simplifyPath(it.path)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">กิจกรรม:</span> {actionLabel(it.action)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">รายการ:</span> {it.entityType || '-'} {it.entityId ? `(${it.entityId})` : ''}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">หมายเหตุ:</span> {it.message || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <h3 className="text-xs font-bold text-slate-800">รายละเอียดเพิ่มเติม (สำหรับตรวจสอบ)</h3>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-600">ผู้ใช้:</span>{' '}
                        {it.user ? `${it.user.name || it.user.email} (${roleLabel(it.user.role)})` : '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">วันเวลา:</span> {fmtDateTime(it.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-center">
          {nextCursor ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่ม'}
            </button>
          ) : (
            !loading && (
              <div className="text-xs text-slate-500">
                แสดงครบแล้ว {items.length} รายการ
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

