import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T, index: number) => React.ReactNode;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  compact?: boolean;
  striped?: boolean;
  className?: string;
  highlightRow?: (row: T, index: number) => boolean;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  compact = false,
  striped = true,
  className,
  highlightRow,
}: DataTableProps<T>) {
  return (
    <div className={clsx('overflow-x-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'font-semibold text-gray-600',
                  compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.align !== 'right' && col.align !== 'center' && 'text-left',
                  col.headerClassName,
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={rowKey(row, idx)}
              className={clsx(
                'border-b border-gray-100 last:border-0',
                striped && idx % 2 === 1 && 'bg-gray-50/50',
                highlightRow?.(row, idx) && 'bg-amber-50',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    compact ? 'px-2 py-1 text-xs' : 'px-3 py-2',
                    col.align === 'right' && 'text-right font-mono',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
