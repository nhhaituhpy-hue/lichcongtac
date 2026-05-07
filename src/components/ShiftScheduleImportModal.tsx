import { useState, useRef } from 'react';
import { X, Upload, File, Download, AlertCircle } from 'lucide-react';
import { ShiftSchedule } from '../types';
import * as XLSX from 'xlsx';

interface ShiftScheduleImportModalProps {
  onClose: () => void;
  onImport: (schedules: ShiftSchedule[]) => void;
  currentMonth: string; // Format: YYYY-MM
}

// Shift mapping: X, X1 = Ca 1; X2 = Ca 2; Đ = Ca 3
const SHIFT_DISPLAY_MAP: Record<string, string> = {
  'X': 'Ca 1',
  'X1': 'Ca 1',
  'X2': 'Ca 2',
  'Đ': 'Ca 3'
};

// Employees to display (exclude last 2: security staff)
const DISPLAY_EMPLOYEES = ['Văn Ngọc Huy', 'Châu Trọng Lịnh', 'Nguyễn Hoàng Hải', 'Lương Minh Tuân', 'Lê Minh Hoàng'];

export default function ShiftScheduleImportModal({ onClose, onImport, currentMonth }: ShiftScheduleImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate sample Excel template
  const generateSampleTemplate = () => {
    const workbook = XLSX.utils.book_new();
    
    // Create header row
    const headerRow = ['Ngày', ...DISPLAY_EMPLOYEES];
    
    // Create data rows (1-31 days)
    const data: any[] = [headerRow];
    for (let day = 1; day <= 31; day++) {
      const row = [day];
      // Add empty cells for employees
      for (let i = 1; i < headerRow.length; i++) {
        row.push('');
      }
      data.push(row);
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Format header row
    for (let i = 0; i < headerRow.length; i++) {
      const cellRef = XLSX.utils.encode_col(i) + '1';
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '366092' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },
      ...DISPLAY_EMPLOYEES.map(() => ({ wch: 12 }))
    ];
    
    // Add instructions sheet
    const instructionsWorksheet = XLSX.utils.aoa_to_sheet([
      ['HƯỚNG DẪN ĐIỀN LỊCH TRỰC'],
      [],
      ['Quy tắc:'],
      ['X hoặc X1', '= Ca 1 (sáng)'],
      ['X2', '= Ca 2 (chiều)'],
      ['Đ', '= Ca 3 (đêm)'],
      ['C', '= Đi công tác (bỏ qua)'],
      [],
      ['Cách điền:'],
      ['1. Điền giá trị X, X1, X2, hoặc Đ vào ô tương ứng với ngày và nhân viên'],
      ['2. Nếu là C thì hệ thống sẽ bỏ qua (coi như nghỉ)'],
      ['3. Để ô trống nếu không có lịch trực'],
      [],
      ['Ví dụ:'],
      ['Ngày', ...DISPLAY_EMPLOYEES],
      [1, 'X', 'X2', 'Đ', '', ''],
      [2, 'X1', 'Đ', 'X2', '', '']
    ]);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch Trực');
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Hướng Dẫn');
    
    // Generate file
    XLSX.writeFile(workbook, `Lich_truc_TUH_${currentMonth}.xlsx`);
  };

  // Parse Excel file
  const parseExcelFile = (buffer: ArrayBuffer): ShiftSchedule[] => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      if (!worksheet) {
        throw new Error('Sheet không tồn tại');
      }
      
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
      const schedules: ShiftSchedule[] = [];
      
      if (data.length < 2) {
        throw new Error('File không có dữ liệu');
      }
      
      // First row is header with employee names
      const header = data[0] as string[];
      
      // Process data rows starting from row 2 (index 1)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || !row[0]) continue;
        
        const day = parseInt(row[0]);
        if (isNaN(day) || day < 1 || day > 31) continue;
        
        // Process each employee's shift
        for (let colIndex = 1; colIndex < header.length && colIndex < row.length; colIndex++) {
          const personName = header[colIndex];
          const shiftValue = row[colIndex];
          
          if (!personName || !shiftValue) continue;
          
          // Skip if value is 'C' (business trip)
          if (String(shiftValue).toUpperCase().trim() === 'C') continue;
          
          // Normalize shift value
          const normalizedShift = String(shiftValue).toUpperCase().trim();
          
          // Map to display format and validate
          const displayShift = SHIFT_DISPLAY_MAP[normalizedShift];
          if (!displayShift) continue;
          
          schedules.push({
            id: `${currentMonth}-${day}-${personName}`.replace(/\s+/g, '_'),
            month: currentMonth,
            personName,
            date: day,
            shiftType: normalizedShift // Store original value (X, X1, X2, Đ)
          });
        }
      }
      
      return schedules;
    } catch (err: any) {
      throw new Error(`Lỗi khi đọc file Excel: ${err.message}`);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const buffer = await file.arrayBuffer();
      const schedules = parseExcelFile(buffer);
      
      if (schedules.length === 0) {
        setError('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại format.');
        setIsLoading(false);
        return;
      }
      
      onImport(schedules);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đọc file');
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: fileInputRef.current } as any);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-container-highest flex justify-between items-center">
          <h2 className="text-lg font-black text-on-surface">Import Lịch Trực</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* Info Box */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Chọn file Excel hoặc tạo file mẫu để nhập lịch trực cho tháng <span className="font-bold">{currentMonth}</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 p-3 bg-error/10 border border-error/30 rounded-lg">
              <AlertCircle size={18} className="text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-surface-container-highest rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="text-on-surface-variant/60" />
            <p className="text-sm font-bold text-on-surface text-center">
              Kéo file vào đây<br />hoặc bấm để chọn file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          {/* Sample File Generation */}
          <div className="border border-surface-container-highest rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Chưa có file mẫu?
            </p>
            <button
              onClick={generateSampleTemplate}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Tạo file mẫu Excel
            </button>
            <p className="text-[11px] text-on-surface-variant">
              File mẫu sẽ được tải xuống với tên: <code className="bg-surface-container-lowest px-1 py-0.5 rounded">Lich_truc_TUH_{currentMonth}.xlsx</code>
            </p>
          </div>

          {/* File Format Info */}
          <div className="bg-surface-container-lowest rounded-xl p-3 flex flex-col gap-2">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase">Quy tắc ca trực:</p>
            <ul className="text-[10px] text-on-surface-variant space-y-1">
              <li><span className="font-bold">X, X1</span> = Ca 1 (sáng)</li>
              <li><span className="font-bold">X2</span> = Ca 2 (chiều)</li>
              <li><span className="font-bold">Đ</span> = Ca 3 (đêm)</li>
              <li><span className="font-bold">C</span> = Đi công tác (bỏ qua)</li>
              <li><span className="font-bold">Trống</span> = Không có lịch trực</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-container-highest flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-surface-container-highest text-on-surface font-bold hover:bg-surface-container transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
