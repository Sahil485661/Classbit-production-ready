import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api/auth';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
    try {
        const response = await axios.post(`${API_URL}/login`, credentials);
        if (response.data.requirePasswordChange) {
            return response.data; // { requirePasswordChange: true, email: '...' }
        }
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Connection failed' });
    }
});

const initialState = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
    requirePasswordChange: false,
    tempEmail: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.requirePasswordChange) {
                    state.requirePasswordChange = true;
                    state.tempEmail = action.payload.email;
                } else {
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                    state.requirePasswordChange = false;
                    state.tempEmail = null;
                }
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || action.error?.message || 'Login failed';
            });
    }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
