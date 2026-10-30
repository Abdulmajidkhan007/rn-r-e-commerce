import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import { FaqSchema, type Faq, type LocalizedText } from '@kidswear/core';
import { useSaveFaq } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';

type Lang = 'uz' | 'en' | 'ru';
const LANGS: Lang[] = ['uz', 'en', 'ru'];
const empty = (): LocalizedText => ({ uz: '', en: '', ru: '' });

/** Drops empty optional locales so they fall back to uz on the site. */
function clean(text: LocalizedText): LocalizedText {
  return {
    uz: text.uz.trim(),
    ...(text.en?.trim() ? { en: text.en.trim() } : {}),
    ...(text.ru?.trim() ? { ru: text.ru.trim() } : {}),
  };
}

export function FaqDialog({
  open,
  faq,
  nextOrder,
  onClose,
}: {
  open: boolean;
  faq?: Faq;
  /** Default order number for a new entry (after the last one). */
  nextOrder: number;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const save = useSaveFaq();
  const [lang, setLang] = useState<Lang>('uz');
  const [question, setQuestion] = useState<LocalizedText>(faq?.question ?? empty());
  const [answer, setAnswer] = useState<LocalizedText>(faq?.answer ?? empty());
  const [order, setOrder] = useState(String(faq?.order ?? nextOrder));
  const [error, setError] = useState<string | null>(null);

  const setLocalized =
    (setter: React.Dispatch<React.SetStateAction<LocalizedText>>) => (value: string) =>
      setter((prev) => ({ ...prev, [lang]: value }));

  const submit = async (): Promise<void> => {
    setError(null);
    const input = {
      question: clean(question),
      answer: clean(answer),
      order: Number(order),
    };
    const check = FaqSchema.safeParse({ ...input, id: 'x', createdAt: 0, updatedAt: 0 });
    if (!check.success || !input.question.uz || !input.answer.uz) {
      setError(t('adminContent.faqInvalid'));
      return;
    }
    try {
      await save.mutateAsync({ id: faq?.id ?? null, input });
      onClose();
    } catch {
      setError(t('adminContent.saveFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{faq ? t('adminContent.editFaq') : t('adminContent.newFaq')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Tabs value={lang} onChange={(_, v: Lang) => setLang(v)}>
            {LANGS.map((l) => (
              <Tab key={l} value={l} label={l.toUpperCase() + (l === 'uz' ? ' *' : '')} />
            ))}
          </Tabs>
          <TextField
            label={t('adminContent.faqQuestion')}
            value={question[lang] ?? ''}
            onChange={(e) => setLocalized(setQuestion)(e.target.value)}
          />
          <TextField
            label={t('adminContent.faqAnswer')}
            helperText={t('adminContent.bodyHint')}
            multiline
            minRows={5}
            value={answer[lang] ?? ''}
            onChange={(e) => setLocalized(setAnswer)(e.target.value)}
          />
          <TextField
            label={t('adminContent.faqOrder')}
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={save.isPending}>
          {t('admin.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
