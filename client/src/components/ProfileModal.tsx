import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Mail, User, LogOut, MapPin, Briefcase, FileText, Camera } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  totalPoints: number;
  profileImageUrl?: string;
  bio?: string;
  profession?: string;
  city?: string;
  onSave?: (data: { name: string; email: string; bio: string; profession: string; city: string; profileImageUrl: string }) => void;
  onLogout?: () => void;
}

export default function ProfileModal({
  open,
  onOpenChange,
  userName,
  userEmail,
  totalPoints,
  profileImageUrl = '',
  bio = '',
  profession = '',
  city = '',
  onSave = () => {},
  onLogout = () => {}
}: ProfileModalProps) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [userBio, setUserBio] = useState(bio);
  const [userProfession, setUserProfession] = useState(profession);
  const [userCity, setUserCity] = useState(city);
  const [profileImage, setProfileImage] = useState(profileImageUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setName(userName);
    setEmail(userEmail);
    setUserBio(bio);
    setUserProfession(profession);
    setUserCity(city);
    setProfileImage(profileImageUrl);
  }, [userName, userEmail, bio, profession, city, profileImageUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    onSave({ name, email, bio: userBio, profession: userProfession, city: userCity, profileImageUrl: profileImage });
    setIsEditing(false);
    console.log('Profile updated:', { name, email, bio: userBio, profession: userProfession, city: userCity });
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
            <div className="relative group">
              <Avatar className="w-24 h-24">
                {profileImage && <AvatarImage src={profileImage} alt={name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
              {userProfession && <p className="text-xs text-muted-foreground mt-1">{userProfession}</p>}
              {userCity && <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> {userCity}</p>}
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
            <div className="space-y-4 max-h-96 overflow-y-auto">
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
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-profession" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Profession
                </Label>
                <Input
                  id="profile-profession"
                  placeholder="e.g., Software Engineer"
                  value={userProfession}
                  onChange={(e) => setUserProfession(e.target.value)}
                  data-testid="input-profile-profession"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-city" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  City
                </Label>
                <Input
                  id="profile-city"
                  placeholder="e.g., San Francisco"
                  value={userCity}
                  onChange={(e) => setUserCity(e.target.value)}
                  data-testid="input-profile-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-bio" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Bio
                </Label>
                <Textarea
                  id="profile-bio"
                  placeholder="Tell us about yourself..."
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  data-testid="textarea-profile-bio"
                  className="resize-none"
                  rows={3}
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
