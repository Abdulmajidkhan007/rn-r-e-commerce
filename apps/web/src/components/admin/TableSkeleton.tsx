import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Skeleton } from '@/components';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/** Refined loading placeholder matching the shape of an admin table. */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps): React.ReactElement {
  const rowIndexes = Array.from({ length: rows }, (_, i) => i);
  const colIndexes = Array.from({ length: columns }, (_, i) => i);

  return (
    <Table size="small">
      <TableBody>
        {rowIndexes.map((rowIdx) => (
          <TableRow key={rowIdx}>
            {colIndexes.map((colIdx) => {
              const isFirst = colIdx === 0;
              const isLast = colIdx === columns - 1;
              return (
                <TableCell key={colIdx} align={isLast ? 'right' : 'left'}>
                  <Skeleton
                    variant="text"
                    width={isFirst ? '80%' : isLast ? '50%' : '65%'}
                    height={isFirst ? 24 : 20}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
