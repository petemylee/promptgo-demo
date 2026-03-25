'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import * as XLSX from 'xlsx';
import { ROLES, type Role } from '@/types/roles';
import UserFormModal from '@/components/users/UserFormModal';
import LoadingScreen from '@/components/LoadingScreen';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  position?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean;
}

interface ImportRow {
  rowNumber: number;
  name: string;
  email: string;
  position: string;
  role: Role;
  selected: boolean;
  valid: boolean;
  error?: string;
}

interface ImportResultRow {
  rowNumber: number;
  name: string;
  email: string;
  role: Role;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
  emailSent?: boolean;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState('');
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [skippedHeaderRow, setSkippedHeaderRow] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [importResults, setImportResults] = useState<ImportResultRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    const nextActive = !(user.isActive ?? true);
    const label = nextActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน (Deactivate)';
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการ${label}ผู้ใช้นี้?`)) {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive, position: user.position ?? '-' }),
      });
      if (!res.ok) {
        let message = `อัปเดตสถานะผู้ใช้ไม่สำเร็จ (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore json parse error
        }
        window.alert(message);
        return;
      }
      fetchUsers();
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const normalizeCellText = (v: unknown) => String(v ?? '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isHeaderRow = (row: unknown[] | undefined) => {
    const b = normalizeCellText(row?.[1]); // Column B
    const c = normalizeCellText(row?.[2]); // Column C
    const g = normalizeCellText(row?.[6]); // Column G

    const bLooksName = b.includes('ชื่อ') || b.toLowerCase().includes('name') || b === 'ชื่อจริง';
    const cLooksSurname = c.includes('นามสกุล') || c.toLowerCase().includes('surname') || c === 'นามสกุล';
    if (!bLooksName || !cLooksSurname) return false;

    // Avoid skipping if row1 is likely real data (email should look like an email).
    const emailLooksValid = emailRegex.test(normalizeCellText(g).toLowerCase());
    if (emailLooksValid) return false;

    // If header, email column typically mentions "email"/"อีเมล"
    const gLooksEmailHeader = g.toLowerCase().includes('email') || g.includes('อีเมล');
    return gLooksEmailHeader;
  };

  const parseExcelRows = (rows: unknown[][]): ImportRow[] => {
    const parsed: ImportRow[] = [];
    let dataRowCounter = 0;

    const headerDetected = isHeaderRow(rows[0]);
    const startIndex = headerDetected ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i] || [];
      const firstName = normalizeCellText(row[1]);
      const lastName = normalizeCellText(row[2]);
      const emailRaw = normalizeCellText(row[6]);
      const position = normalizeCellText(row[8]);
      const name = `${firstName} ${lastName}`.trim();

      if (!firstName && !lastName && !emailRaw && !position) continue;

      dataRowCounter += 1;

      const email = emailRaw.toLowerCase();

      let error = '';
      if (!name) error = 'ชื่อ/นามสกุลไม่ครบ';
      else if (!email) error = 'ไม่มีอีเมล';
      else if (!emailRegex.test(email)) error = 'รูปแบบอีเมลไม่ถูกต้อง';
      else if (!position) error = 'ไม่มีตำแหน่ง';

      parsed.push({
        rowNumber: dataRowCounter,
        name,
        email,
        position,
        role: 'Requester',
        selected: !error,
        valid: !error,
        error: error || undefined,
      });
    }

    setSkippedHeaderRow(headerDetected);
    return parsed;
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSummary(null);
    setImportResults([]);
    setSkippedHeaderRow(false);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        setImportError('ไม่พบข้อมูลในไฟล์ Excel');
        return;
      }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
        header: 1,
        defval: '',
      });
      const parsedRows = parseExcelRows(rows as unknown[][]);
      if (parsedRows.length === 0) {
        setImportError('ไม่พบข้อมูลที่นำเข้าได้ในไฟล์');
      }
      setImportRows(parsedRows);
    } catch {
      setImportError('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์ Excel');
      setImportRows([]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleImportRow = (rowNumber: number, selected: boolean) => {
    setImportRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, selected } : row))
    );
  };

  const handleSelectAllValidRows = (selected: boolean) => {
    setImportRows((prev) =>
      prev.map((row) => (row.valid ? { ...row, selected } : row))
    );
  };

  const handleImportRoleChange = (rowNumber: number, role: Role) => {
    setImportRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, role } : row))
    );
  };

  const revalidateRow = (row: ImportRow): ImportRow => {
    let error = '';
    if (!row.name) error = 'ชื่อ/นามสกุลไม่ครบ';
    else if (!row.email) error = 'ไม่มีอีเมล';
    else if (!emailRegex.test(row.email)) error = 'รูปแบบอีเมลไม่ถูกต้อง';
    else if (!row.position) error = 'ไม่มีตำแหน่ง';

    const valid = !error;
    return { ...row, valid, error: error || undefined };
  };

  const handleImportEmailChange = (rowNumber: number, nextEmailRaw: string) => {
    const nextEmail = nextEmailRaw.trim().toLowerCase();
    setImportRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row;
        const updated: ImportRow = { ...row, email: nextEmail };
        return revalidateRow(updated);
      })
    );
  };

  const handleCreateImportedUsers = async () => {
    const selectedRows = importRows.filter((row) => row.selected && row.valid);
    if (selectedRows.length === 0) {
      window.alert('กรุณาเลือกรายชื่อที่ถูกต้องอย่างน้อย 1 รายการ');
      return;
    }
    setIsImportSubmitting(true);
    setImportError('');
    setImportSummary(null);
    setImportResults([]);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulkImport',
          users: selectedRows.map((row) => ({
            rowNumber: row.rowNumber,
            name: row.name,
            email: row.email,
            position: row.position,
            role: row.role,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Import ไม่สำเร็จ');
      }
      setImportSummary(data.summary ?? null);
      setImportResults((data.results ?? []) as ImportResultRow[]);
      await fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) setImportError(err.message);
      else setImportError('เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้');
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const pathname = usePathname();
  useEffect(() => {
    setIsModalOpen(false);
    setEditingUser(null);
  }, [pathname]);

  if (isLoading) return <div className="p-4 md:p-8"><LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูลผู้ใช้..." /></div>;

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });
  const validImportRows = importRows.filter((row) => row.valid);
  const selectedValidImportRows = validImportRows.filter((row) => row.selected).length;
  const allValidSelected = validImportRows.length > 0 && selectedValidImportRows === validImportRows.length;

  const RoleBadge = ({ role }: { role: Role }) => {
    const palette: Record<Role, { bg: string; text: string }> = {
      Requester: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
      Driver: { bg: 'bg-amber-50', text: 'text-amber-700' },
      Admin: { bg: 'bg-[#004c80]/10', text: 'text-[#004c80]' },
      Executive: { bg: 'bg-purple-50', text: 'text-purple-700' },
    };
    const p = palette[role];
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>
        {role}
      </span>
    );
  };

  const StatusBadge = ({ isActive }: { isActive?: boolean }) => {
    const active = isActive ?? true;
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/5 ${
          active
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {isModalOpen ? (
        <div className="mx-auto w-full max-w-5xl">
          <UserFormModal
            variant="fullpage"
            isOpen
            onClose={handleCloseModal}
            onUserUpdated={fetchUsers}
            initialData={editingUser}
          />
        </div>
      ) : (
        <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#004c80]">User Management</h1>
            <p className="text-sm text-gray-700">จัดการผู้ใช้งาน ระบบ และกำหนดบทบาท</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <div className="relative w-full md:w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา: ชื่อ ตำแหน่ง อีเมล หรือบทบาท"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <button onClick={handleOpenFilePicker} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white shadow hover:bg-emerald-700">
              Import รายชื่อ
            </button>
            <button onClick={handleAdd} className="rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">
              + Add User
            </button>
          </div>
        </div>
        {(importError || importRows.length > 0 || importSummary) && (
          <div className="mb-6 rounded-lg border border-[#004c80]/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#004c80]">Import Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllValidRows(!allValidSelected)}
                  disabled={validImportRows.length === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {allValidSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateImportedUsers}
                  disabled={isImportSubmitting || selectedValidImportRows === 0}
                  className="rounded-lg bg-[#004c80] px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  {isImportSubmitting ? 'กำลังสร้างบัญชี...' : `สร้างบัญชีผู้ใช้ (${selectedValidImportRows})`}
                </button>
              </div>
            </div>

            {importError && <p className="mb-3 text-sm text-red-600">{importError}</p>}
            {skippedHeaderRow && (
              <p className="mb-3 text-sm text-gray-600">
                ตรวจพบหัวคอลัมน์ในแถวแรกแล้วข้ามอัตโนมัติ
              </p>
            )}

            {importRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="w-20 px-2 py-2 text-left">เลือก</th>
                      <th className="w-16 px-2 py-2 text-left">ลำดับ</th>
                      <th className="px-2 py-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="px-2 py-2 text-left">Email</th>
                      <th className="px-2 py-2 text-left">ตำแหน่ง</th>
                      <th className="w-40 px-2 py-2 text-left">Role</th>
                      <th className="w-44 px-2 py-2 text-left">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row) => (
                      <tr key={row.rowNumber} className="border-b">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={!row.valid}
                            onChange={(e) => handleToggleImportRow(row.rowNumber, e.target.checked)}
                          />
                        </td>
                        <td className="px-2 py-2">{row.rowNumber}</td>
                        <td className="px-2 py-2">{row.name || '-'}</td>
                        <td className="px-2 py-2">
                          {row.valid ? (
                            <span>{row.email || '-'}</span>
                          ) : (
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) => handleImportEmailChange(row.rowNumber, e.target.value)}
                              className="w-full rounded border border-amber-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                              placeholder="กรอกอีเมลให้ถูกต้อง"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">{row.position || '-'}</td>
                        <td className="px-2 py-2">
                          <select
                            value={row.role}
                            disabled={!row.valid}
                            onChange={(e) => handleImportRoleChange(row.rowNumber, e.target.value as Role)}
                            className="w-full rounded border border-gray-300 px-2 py-1"
                          >
                            {ROLES.map((roleValue) => (
                              <option key={roleValue} value={roleValue}>
                                {roleValue}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          {row.valid ? (
                            <span className="text-emerald-700">พร้อมนำเข้า</span>
                          ) : (
                            <span className="text-red-600">{row.error || 'ข้อมูลไม่ถูกต้อง'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {importSummary && (
              <div className="mt-4 rounded-lg bg-[#004c80]/5 p-3 text-sm text-gray-800">
                <p>
                  ผลการนำเข้า: ทั้งหมด {importSummary.total} | สำเร็จ {importSummary.created} | ข้าม {importSummary.skipped} | ล้มเหลว {importSummary.failed}
                </p>
              </div>
            )}

            {importResults.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="w-12 px-2 py-2 text-left">ลำดับ</th>
                      <th className="px-2 py-2 text-left">ชื่อ</th>
                      <th className="px-2 py-2 text-left">Email</th>
                      <th className="w-24 px-2 py-2 text-left">ผลลัพธ์</th>
                      <th className="px-2 py-2 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((result) => (
                      <tr key={`${result.rowNumber}-${result.email}`} className="border-b">
                        <td className="px-2 py-2">{result.rowNumber}</td>
                        <td className="px-2 py-2">{result.name || '-'}</td>
                        <td className="px-2 py-2">{result.email || '-'}</td>
                        <td className="px-2 py-2">
                          {result.status === 'created' ? 'สำเร็จ' : result.status === 'skipped' ? 'ข้าม' : 'ล้มเหลว'}
                        </td>
                        <td className="px-2 py-2">{result.reason || (result.emailSent === false ? 'สร้างสำเร็จ แต่ส่งอีเมลไม่สำเร็จ' : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">ชื่อ</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">ตำแหน่ง</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/5">Email</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">เบอร์โทร</th>
                  <th className="text-center py-2 px-4 text-[#004c80] w-24">Role</th>
                  <th className="text-center py-2 px-4 text-[#004c80] w-28">Status</th>
                  <th className="text-center py-2 px-4 text-[#004c80] w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-[#0076c3]/5">
                    <td className="py-2 px-4 whitespace-nowrap">{user.name}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.position || '-'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.email}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.phoneNumber || '-'}</td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center">
                        <RoleBadge role={user.role} />
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center">
                        <StatusBadge isActive={user.isActive} />
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          aria-label="Edit user"
                          className="group inline-flex items-center justify-center rounded-full p-2 ring-1 ring-[#004c80]/20 bg-white text-[#004c80] hover:bg-[#004c80]/5 hover:ring-[#004c80]/30 transition"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.713 0l-1.2 1.2 3.713 3.713 1.2-1.2a2.625 2.625 0 0 0 0-3.713z"/>
                            <path d="M3 17.25V21h3.75L19.573 8.177 15.86 4.464 3 17.25z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          aria-label="Toggle active"
                          className="group inline-flex items-center justify-center rounded-full p-2 ring-1 ring-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:ring-gray-300 transition"
                          title={(user.isActive ?? true) ? 'Deactivate' : 'Activate'}
                        >
                          {(user.isActive ?? true) ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                              <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a7.934 7.934 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20Zm-6.3-3.1L16.9 5.7A8 8 0 0 1 5.7 16.9Z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                              <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm-1 14.5-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9.1Z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">🙂</div>
                        <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีผู้ใช้ที่ตรงกับคำค้นหา</h3>
                        <p className="text-sm text-gray-500 mt-1">ลองปรับคำค้นหาหรือเพิ่มผู้ใช้ใหม่</p>
                        <button onClick={handleAdd} className="mt-4 rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ Add User</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

