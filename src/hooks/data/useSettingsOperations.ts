import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Lead, Admission, Student, Staff, Expense, Income, AppSettings, UserPermission, Notification, AcademicRecord, SalaryPayment, FeePayment, Installment, FeeTransaction , AdmissionStatus } from '../../types';

export function useSettingsOperations(ctx: any) {
  const { generateStudentId, user, settings, setSettings, permissions, notifications, setNotifications, fetchData } = ctx;
  const updateSettings = async (newSettings: AppSettings) => {
    const backupSettings = settings;
    setSettings({ ...newSettings, id: (settings as any)?.id });

    try {
      const payload = {
        college_name: newSettings.collegeName,
        campus_name: newSettings.campusName,
        logo_url: newSettings.logo,
        address: newSettings.address,
        contact_number: newSettings.contactNumber,
        email: newSettings.email,
        website: newSettings.website,
        principal_name: newSettings.principalName,
        theme_color: newSettings.themeColor,
        currency_symbol: newSettings.currencySymbol,
        academic_session: newSettings.academicSession,
        enabled_modules: newSettings.enabledModules,
        updated_at: new Date().toISOString(),
        config: {
          sidebarColor: newSettings.sidebarColor,
          sidebarTextColor: newSettings.sidebarTextColor,
          headerColor: newSettings.headerColor,
          headerTextColor: newSettings.headerTextColor,
          fontFamily: newSettings.fontFamily,
          cardRadius: newSettings.cardRadius,
          glassEffect: newSettings.glassEffect,
          autoLeadConversion: newSettings.autoLeadConversion,
          defaulterAlertThreshold: newSettings.defaulterAlertThreshold,
          allowQuickNav: newSettings.allowQuickNav,
          enableHighlighting: newSettings.enableHighlighting,
          admissionSlipCustomText: newSettings.admissionSlipCustomText,
          feeReceiptCustomText: newSettings.feeReceiptCustomText,
          logo: newSettings.logo,
          predefinedSections: newSettings.predefinedSections
        }
      };

      if ((settings as any)?.id) {
        const { error } = await supabase.from('settings').update(payload).eq('id', (settings as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('settings').insert([payload]);
        if (error) throw error;
      }
      
      toast.success("Settings updated");
    } catch (e: any) {
      setSettings(backupSettings);
      console.error("Update Settings Error:", e);
      toast.error("Failed to update settings" + (e?.message ? `: ${e.message}` : ''));
    }
  };

  const updatePermission = async (permission: Omit<UserPermission, 'id'>) => {
      try {
        // 1. Call Node backend to create user in Auth (so they can actually log in)
        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: permission.email,
            password: permission.customPassword,
            displayName: permission.displayName
          })
        });
        
        const data = await response.json();
        
        if (!response.ok && !data.message?.includes('already exists')) {
          throw new Error(data.error || 'Failed to create user in Auth system');
        }

        // 2. Save permissions to the 'permissions' table
        const { error } = await supabase.from('permissions').upsert({
          email: permission.email,
          display_name: permission.displayName,
          sections: permission.sections,
          is_admin: permission.isAdmin,
          status: 'offline',
          last_active: new Date().toISOString()
        }, { onConflict: 'email' });
        
        if (error) throw error;
        
        // await fetchData(true);
        toast.success(`Access updated for ${permission.email}`);
      } catch (e: any) {
        console.error("Update Permission Error:", e);
        toast.error(`Permission update failed: ${e.message}`);
      }
    };

  const deletePermission = async (email: string) => {
      try {
        const { error } = await supabase.from('permissions').delete().eq('email', email);
        if (error) throw error;
        
        // await fetchData(true);
        toast.success(`Access removed for ${email}`);
      } catch (e: any) {
        toast.error(`Permission deletion failed: ${e.message}`);
      }
    };

  const markNotificationRead = async (id: string) => {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } catch (e) {
        console.error("Failed to mark notification as read", e);
      }
    };

  const clearAllNotifications = async () => {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
        if (error) throw error;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("All notifications marked as read");
      } catch (e) {
        toast.error("Failed to clear notifications");
      }
    };
  return { updateSettings, updatePermission, deletePermission, markNotificationRead, clearAllNotifications };
}