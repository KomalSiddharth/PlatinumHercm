import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Mail, User, LogOut, Camera } from 'lucide-react';
import { ObjectUploader } from './ObjectUploader';
import { apiRequest } from '@/lib/queryClient';
import type { UploadResult } from '@uppy/core';
import { useToast } from '@/hooks/use-toast';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  totalPoints: number;
  profileImageUrl?: string | null;
  onSave?: (data: { name: string; email: string }) => void;
  onLogout?: () => void;
  onProfileImageUpdate?: () => void;
}

export default function ProfileModal({
  open,
  onOpenChange,
  userName,
  userEmail,
  totalPoints,
  profileImageUrl,
  onSave = () => {},
  onLogout = () => {},
  onProfileImageUpdate = () => {}
}: ProfileModalProps) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    onSave({ name, email });
    setIsEditing(false);
    console.log('Profile updated:', { name, email });
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      toast({
        title: "Upload Error",
        description: "Failed to prepare file upload. Please try again.",
        variant: "destructive",
      });
      throw new Error('Failed to get upload URL');
    }
    
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      setIsUploadingImage(true);
      try {
        const uploadedFile = result.successful[0];
        const uploadURL = uploadedFile.uploadURL;

        await apiRequest('/api/profile/picture', 'PUT', {
          profileImageURL: uploadURL,
        });

        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully.",
        });

        onProfileImageUpdate();
      } catch (error) {
        console.error('Error updating profile picture:', error);
        toast({
          title: "Error",
          description: "Failed to update profile picture. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Profile</DialogTitle>
          <DialogDescription>Manage your account settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {profileImageUrl && (
                  <AvatarImage src={profileImageUrl} alt={name} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  variant="secondary"
                  size="icon"
                  buttonClassName="rounded-full h-10 w-10 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </ObjectUploader>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 text-center border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Points</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalPoints.toLocaleString()}</p>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-profile-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-profile-email"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setName(userName);
                    setEmail(userEmail);
                    setIsEditing(false);
                  }}
                  className="flex-1"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                  data-testid="button-save-profile"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full"
                data-testid="button-edit-profile"
              >
                Edit Profile
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onLogout();
                  onOpenChange(false);
                }}
                className="w-full gap-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
