"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Smartphone,
  Laptop,
  Key,
  LogOut,
  Check,
  AlertCircle,
  Clock,
  Building,
  Store,
  CheckCircle2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { profile, user, logout, fetchSession } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"details" | "security" | "sessions">("details");

  // Profile Edit State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      if (!user?.id) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await fetchSession();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordError(null);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <MainLayout
      title="User Account & Security Profile"
      subtitle="Manage your personal profile, active device sessions, and security credentials"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
              {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : "AG"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {profile?.full_name || "Store Administrator"}
                </h2>
                <Badge variant="success">{profile?.role || "Owner"}</Badge>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {user?.email || "owner@agsstore.com"}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3 text-brand-600" /> AGS Store (Main Branch)
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={logout}
            className="text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {[
            { id: "details", label: "Profile Information", icon: User },
            { id: "security", label: "Password & Security", icon: Key },
            { id: "sessions", label: "Active Sessions & Devices", icon: Laptop },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-2xs border border-brand-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                Personal Identity & Store Role
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <Input
                    label="Mobile Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Registered Work Email"
                    disabled
                    value={user?.email || "owner@agsstore.com"}
                  />
                  <Input label="Assigned Role" disabled value={profile?.role || "Owner"} />
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  {profileSuccess ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
                    </span>
                  ) : (
                    <span />
                  )}

                  <Button
                    type="submit"
                    isLoading={isUpdatingProfile}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Password & Security */}
        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                Change Master Account Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                <Input
                  type="password"
                  label="New Master Password *"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8+ characters"
                />

                <Input
                  type="password"
                  label="Confirm New Password *"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />

                <PasswordStrengthMeter password={newPassword} />

                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={isUpdatingPassword}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Active Sessions & Devices */}
        {activeTab === "sessions" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-gray-900">
                Active Logged-In Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="p-4 border border-brand-200 bg-brand-50/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-brand-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      Current Active Browser Session
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      IP: 127.0.0.1 • Windows • Next.js App Router
                    </div>
                  </div>
                </div>
                <Badge variant="success">This Device</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
