import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { errorMessage, useCaseActionMutation } from '../api/hardshipApi';
import type { CaseAction, CaseDetail } from '../api/types';
import { addDays, formatDate, todaySydney } from '../lib/dates';

export type ActionKind = CaseAction['kind'];

const titles: Record<ActionKind, string> = {
  'request-information': 'Request information from the customer',
  'information-received': 'Record information received',
  response: 'Record the hardship decision',
  'variation-notice': 'Record written variation notice sent',
};

export function CaseActionDialog({ kind, detail, onClose }: { kind: ActionKind | null; detail: CaseDetail; onClose: () => void }) {
  const today = todaySydney();
  const [date, setDate] = useState(today);
  const [details, setDetails] = useState('Please send your last 3 payslips and a summary of your household income and expenses.');
  const [outcome, setOutcome] = useState<'Approved' | 'Declined'>('Approved');
  const [days, setDays] = useState(90);
  const [notes, setNotes] = useState('');
  const [run, { isLoading, error, reset }] = useCaseActionMutation();

  useEffect(() => {
    setDate(today);
    reset();
  }, [kind, today, reset]);

  if (!kind) return null;

  const action = (): CaseAction => {
    switch (kind) {
      case 'request-information': return { kind, body: { requestDate: date, details } };
      case 'information-received': return { kind, body: { receivedDate: date } };
      case 'response': return { kind, body: { respondedDate: date, outcome, arrangementDays: outcome === 'Approved' ? days : undefined, notes } };
      case 'variation-notice': return { kind, body: { sentDate: date } };
    }
  };

  const submit = async () => {
    const result = await run({ id: detail.caseId, action: action() });
    if (!('error' in result)) onClose();
  };

  const infoWindowClosed = kind === 'request-information' && date > detail.infoRequestDeadline;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{titles[kind]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{errorMessage(error)}</Alert>}
          {kind === 'request-information' && (
            <Alert severity={infoWindowClosed ? 'error' : 'info'}>
              {infoWindowClosed
                ? `Too late: information had to be requested by ${formatDate(detail.infoRequestDeadline)}.`
                : `Requesting information moves the deadline. If the customer never replies, you must still respond by ${formatDate(addDays(date, 28))}.`}
            </Alert>
          )}
          {kind === 'information-received' && (
            <Alert severity="info">The 21-day response clock restarts from this date: the new deadline will be {formatDate(addDays(date, 21))}.</Alert>
          )}
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }} />
          {kind === 'request-information' && (
            <TextField label="What we asked for" multiline minRows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
          )}
          {kind === 'response' && (
            <>
              <TextField select label="Decision" value={outcome} onChange={(e) => setOutcome(e.target.value as 'Approved' | 'Declined')}>
                <MenuItem value="Approved">Approved – hardship arrangement</MenuItem>
                <MenuItem value="Declined">Declined</MenuItem>
              </TextField>
              {outcome === 'Approved' && (
                <TextField label="Arrangement length (days)" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))}
                  helperText={days > 90 ? 'Over 90 days: a written variation notice is due within 30 days.' : 'Up to 90 days: no written variation notice needed.'} />
              )}
              <TextField label="Notes" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={isLoading || infoWindowClosed}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
