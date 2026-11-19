import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { hardshipApi } from '../api/hardshipApi';
import type { CaseFilters } from '../api/types';

/** Case list filters live in Redux so they survive navigating to a case and back. */
const filtersSlice = createSlice({
  name: 'filters',
  initialState: { status: undefined, risk: undefined, search: '' } as CaseFilters,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<CaseFilters>>) => ({ ...state, ...action.payload }),
    clearFilters: () => ({ status: undefined, risk: undefined, search: '' }),
  },
});

export const { setFilter, clearFilters } = filtersSlice.actions;

export const store = configureStore({
  reducer: {
    filters: filtersSlice.reducer,
    [hardshipApi.reducerPath]: hardshipApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(hardshipApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
