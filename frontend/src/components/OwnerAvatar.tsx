import { Avatar, Box, Typography } from '@mui/material';
import { ink } from '../theme';

const palette = ['#0E5560', '#5B4BB7', '#B5562B', '#2F6FB0', '#7A6A12', '#2E7D5B'];

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0) * 7) >>> 0;
  return palette[h % palette.length];
}

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function OwnerAvatar({ name, size = 26 }: { name: string | null; size?: number }) {
  if (!name) {
    return <Avatar sx={{ width: size, height: size, fontSize: size * 0.42, bgcolor: 'transparent', color: ink.faint, border: `1.5px dashed ${ink.faint}` }}>?</Avatar>;
  }
  return (
    <Avatar sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 600, bgcolor: `${colorFor(name)}1F`, color: colorFor(name) }}>
      {initials(name)}
    </Avatar>
  );
}

export function Owner({ name }: { name: string | null }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <OwnerAvatar name={name} />
      <Typography variant="body2" sx={{ color: name ? ink.text : ink.faint }}>{name ?? 'Not assigned'}</Typography>
    </Box>
  );
}
