import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "../store";

// Define a type for the slice state
interface FilterState {
  project: string | undefined;
  context: string | undefined;
}

// Define the initial state using that type
const initialState: FilterState = {
  project: undefined,
  context: undefined,
};

export const filterSlice = createSlice({
  name: "projectFilter",
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<string>) => {
      state.project = action.payload;
    },
    setContext: (state, action: PayloadAction<string>) => {
      state.context = action.payload;
    },
    unsetProject: (state) => {
      state.project = undefined;
    },
    unsetContext: (state) => {
      state.context = undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setProject, unsetProject, setContext, unsetContext } =
  filterSlice.actions;

export default filterSlice.reducer;
