import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { errorMessage, useCreateCaseMutation } from '../api/hardshipApi';
import type { Channel, CreateCaseRequest, ProductType } from '../api/types';
import { todaySydney } from '../lib/dates';

const products: ProductType[] = ['Home Loan', 'Personal Loan', 'Car Loan', 'Credit Card', 'BNPL'];
const channels: Channel[] = ['Phone', 'Email', 'Web', 'Branch', 'Broker'];

const empty = (): CreateCaseRequest => ({
  fullName: '', email: '', phone: '', contractNumber: '', productType: 'Personal Loan', balance: 0,
  channel: 'Phone', reason: '', receivedDate: todaySydney(), assignedTo: '',
});

export function NewCaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<CreateCaseRequest>(empty);
  const [createCase, { isLoading, error, reset }] = useCreateCaseMutation();
  const navigate = useNavigate();

  const set = <K extends keyof CreateCaseRequest>(key: K) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'balance' ? Number(e.target.value) : e.target.value }));

  const contractValid = /^[A-Z]{2}-\d{6}$/.test(form.contractNumber);
  const canSubmit = form.fullName.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email) && contractValid && form.reason.trim().length >= 5;

  const close = () => {
    setForm(empty());
    reset();
    onClose();
  };

  const submit = async () => {
    const result = await createCase(form);
    if ('data' in result && result.data) {
      close();
      navigate(`/cases/${result.data.caseId}`);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Log a hardship notice</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          The 21-day clock starts the day after the notice is received, whether it came by phone, email or in a branch.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(error)}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Customer name" fullWidth required value={form.fullName} onChange={set('fullName')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email" type="email" fullWidth required value={form.email} onChange={set('email')} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Contract number" placeholder="PL-123456" fullWidth required value={form.contractNumber}
              onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value.toUpperCase() }))}
              error={form.contractNumber !== '' && !contractValid} helperText="Format: two letters, dash, six digits" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select label="Product" fullWidth value={form.productType} onChange={set('productType')}>
              {products.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select label="Channel" fullWidth value={form.channel} onChange={set('channel')}>
              {channels.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="Received" type="date" fullWidth value={form.receivedDate} onChange={set('receivedDate')}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todaySydney() } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="Balance ($)" type="number" fullWidth value={form.balance} onChange={set('balance')} /></Grid>
          <Grid size={12}>
            <TextField label="What the customer told us" fullWidth required multiline minRows={3} value={form.reason} onChange={set('reason')} />
          </Grid>
          <Grid size={12}><TextField label="Assign to (optional)" fullWidth value={form.assignedTo} onChange={set('assignedTo')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || isLoading} onClick={submit}>Log notice</Button>
      </DialogActions>
    </Dialog>
  );
}
