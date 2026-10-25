import { useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { parseCatalogCsv, type Category, type CatalogCsvParseResult } from '@kidswear/core';
import { newProductId } from '@kidswear/firebase';
import { useImportProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

export interface CatalogCsvDialogProps {
  open: boolean;
  onClose: () => void;
  categories: readonly Category[];
}

/** Pick a CSV, see what it contains (or what is wrong), then import. */
export function CatalogCsvDialog({
  open,
  onClose,
  categories,
}: CatalogCsvDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const importProducts = useImportProducts();
  const [parsed, setParsed] = useState<{ result: CatalogCsvParseResult; rows: number } | null>(
    null,
  );
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const categoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const text = await file.text();
    const result = parseCatalogCsv(text, { categoryIds, newId: newProductId });
    const rows = Math.max(0, text.split(/\r?\n/).filter((l) => l.trim() !== '').length - 1);
    setDone(null);
    setParsed({ result, rows });
  };

  const run = async (): Promise<void> => {
    if (!parsed) return;
    const { created, skippedExisting } = await importProducts.mutateAsync(parsed.result.products);
    setDone({ created, skipped: skippedExisting.length });
    setParsed(null);
  };

  const errors = parsed?.result.errors ?? [];
  const ready = parsed && errors.length === 0 && parsed.result.products.length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('admin.catalog.csvTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">{t('admin.catalog.csvHint')}</Typography>
          <Button variant="outlined" component="label">
            {t('admin.catalog.csvChoose')}
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              data-testid="catalog-csv-input"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </Button>
          {ready && (
            <Alert severity="success">
              {t('admin.catalog.csvReady', {
                products: parsed.result.products.length,
                rows: parsed.rows,
              })}
            </Alert>
          )}
          {errors.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('admin.catalog.csvErrors')}
              </Typography>
              {errors.slice(0, 20).map((e, i) => (
                <Typography key={i} variant="body2">
                  {t('admin.catalog.csvLine', { line: e.line })}:{' '}
                  {t(`admin.catalog.csvErr.${e.code}`, { detail: e.detail ?? '' })}
                </Typography>
              ))}
              {errors.length > 20 && <Typography variant="body2">…</Typography>}
            </Alert>
          )}
          {done && (
            <Alert severity="info">
              {t('admin.catalog.csvDone', { created: done.created, skipped: done.skipped })}
            </Alert>
          )}
          {importProducts.isError && <Alert severity="error">{importProducts.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!ready || importProducts.isPending}
          onClick={() => void run()}
        >
          {t('admin.catalog.csvImport')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
