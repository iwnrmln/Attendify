import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Listen for auth state changes - keeps user logged in
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            let message = 'Login failed';
            if (error.code === 'auth/invalid-credential') {
                message = 'Invalid email or password';
            } else if (error.code === 'auth/user-not-found') {
                message = 'User not found';
            }
            throw new Error(message);
        }
    };

    const register = async (email: string, password: string) => {
        try {
            console.log("Attempting to register:", email);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Registration successful:", userCredential.user.email);
        } catch (error: any) {
            console.log("Registration error code:", error.code);
            console.log("Registration error message:", error.message);

            let message = 'Registration failed';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already in use';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password should be at least 6 characters';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email format';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Check your internet connection';
            } else if (error.code === 'auth/operation-not-allowed') {
                message = 'Email/Password sign-in not enabled in Firebase Console';
            }
            throw new Error(message);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}