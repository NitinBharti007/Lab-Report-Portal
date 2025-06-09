import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconEdit, IconCamera } from "@tabler/icons-react";
import PageLayout from "@/components/layouts/PageLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader } from "@/components/shared/loader";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getAvatarUrl(path) {
  if (!path) return null;
  // If path is already a full URL, return it directly
  if (path.startsWith('http')) return path;
  // Otherwise construct from storage
  return `${import.meta.env.SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export default function UserDetails() {
  const [authUserId, setAuthUserId] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) throw authError;

        const userId = authUser.id;
        setAuthUserId(userId);

        const { data: userDetails, error: userError } = await supabase
          .from("users")
          .select("id, name, email, avatar_url, role, created_at")
          .eq("user_id", userId)
          .single();

        if (userError) throw userError;

        setUser(userDetails);
        setFormData({
          name: userDetails.name || "",
          email: userDetails.email || "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load user details.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) throw new Error("Unable to get current user");

      // Generate unique filename with extension
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      // First delete any existing avatar
      try {
        const { data: list } = await supabase.storage
          .from('avatars')
          .list(authUser.id);
        
        if (list && list.length > 0) {
          const filesToRemove = list.map(file => `${authUser.id}/${file.name}`);
          await supabase.storage
            .from('avatars')
            .remove(filesToRemove);
        }
      } catch (deleteError) {
        console.log('No existing avatar to delete or delete failed:', deleteError);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user record with the public URL
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          last_modified: new Date().toISOString()
        })
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setUser(updatedUser);
      toast.success("Avatar updated successfully");
    } catch (err) {
      console.error("Avatar update error:", err);
      toast.error(err.message || "Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, newPassword, confirmPassword } = formData;

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) throw new Error("Unable to get current user");

      // First get the user record to ensure we have the correct ID
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", authUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        throw new Error('Failed to verify user record');
      }

      if (!userRecord) {
        throw new Error('User record not found');
      }

      console.log('Updating user record:', userRecord);

      // Update name in users table using the database ID
      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          name,
          last_modified: new Date().toISOString()
        })
        .eq("id", userRecord.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ 
          password: newPassword 
        });
        if (passwordError) throw passwordError;
      }

      // Fetch fresh user data
      const { data: freshUserData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userRecord.id)
        .single();

      if (fetchError) {
        console.error('Error fetching fresh data:', fetchError);
        throw fetchError;
      }

      if (!freshUserData) {
        throw new Error('Failed to fetch updated user data');
      }

      console.log('Fresh user data:', freshUserData);

      setUser(freshUserData);
      setFormData({
        name: freshUserData.name || "",
        email: freshUserData.email || "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading user details..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !user) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{error || "User not found."}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="grid gap-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20">
                    <AvatarImage 
                      src={getAvatarUrl(user.avatar_url)} 
                      alt={user.name || "User avatar"} 
                      className="object-cover w-full h-full"
                    />
                    <AvatarFallback className="bg-primary/10">
                      {user.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    {uploadingAvatar ? (
                      <Loader size="sm" className="text-white" />
                    ) : (
                      <IconCamera className="h-6 w-6 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle>{user.name || "User"}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      disabled={!isEditing} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      disabled={!isEditing} 
                    />
                  </div>
                  {isEditing && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input 
                          id="newPassword" 
                          name="newPassword" 
                          type="password" 
                          value={formData.newPassword} 
                          onChange={handleInputChange} 
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input 
                          id="confirmPassword" 
                          name="confirmPassword" 
                          type="password" 
                          value={formData.confirmPassword} 
                          onChange={handleInputChange} 
                          placeholder="Confirm new password"
                        />
                      </div>
                    </>
                  )}
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <p className="text-sm text-muted-foreground">{user.role || "N/A"}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Member Since</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  {isEditing ? (
                    <>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: user.name || "",
                            email: user.email || "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </>
                  ) : (
                    <Button 
                      type="button" 
                      onClick={() => setIsEditing(true)} 
                      className="flex items-center gap-2"
                    >
                      <IconEdit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}