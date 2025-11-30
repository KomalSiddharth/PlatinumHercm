import { useState, useEffect, useRef } from 'react';
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
import { Mail, User, LogOut, MapPin, Briefcase, FileText, Image, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  profileImageUrl?: string;
  bio?: string;
  profession?: string;
  city?: string;
  onSave?: (data: { name: string; email: string; bio: string; profession: string; city: string; profileImageUrl: string }) => void;
  onLogout?: () => void;
}

const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      resolve(canvas.toDataURL('image/jpeg'));
    };
    image.onerror = () => resolve(imageSrc);
  });
};

export default function ProfileModal({
  open,
  onOpenChange,
  userName,
  userEmail,
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
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(userName);
    setEmail(userEmail);
    setUserBio(bio);
    setUserProfession(profession);
    setUserCity(city);
    setProfileImage(profileImageUrl);
  }, [userName, userEmail, bio, profession, city, profileImageUrl]);

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (imageToCrop && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setProfileImage(croppedImage);
      setCropDialogOpen(false);
      setImageToCrop('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({ name, email, bio: userBio, profession: userProfession, city: userCity, profileImageUrl: profileImage });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(userName);
    setEmail(userEmail);
    setUserBio(bio);
    setUserProfession(profession);
    setUserCity(city);
    setProfileImage(profileImageUrl);
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Profile</DialogTitle>
            <DialogDescription>Manage your account settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              {isEditing ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="w-32 h-32 rounded-full border-4 border-primary/20 overflow-hidden flex items-center justify-center bg-muted">
                    {profileImage ? (
                      <img src={profileImage} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white text-4xl font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => galleryInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploading}
                    data-testid="button-upload-photo"
                  >
                    <Image className="w-4 h-4" />
                    Choose Photo
                  </Button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    data-testid="input-photo-upload"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-primary/20 overflow-hidden flex items-center justify-center bg-muted">
                  {profileImage ? (
                    <img src={profileImage} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent text-white text-4xl font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-semibold">{name}</h3>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
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
                    onClick={handleCancel}
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
              <div className="space-y-4">
                <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                  {userProfession && (
                    <div className="flex gap-2 items-start">
                      <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Profession</p>
                        <p className="text-sm font-medium">{userProfession}</p>
                      </div>
                    </div>
                  )}
                  {userCity && (
                    <div className="flex gap-2 items-start">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="text-sm font-medium">{userCity}</p>
                      </div>
                    </div>
                  )}
                  {userBio && (
                    <div className="flex gap-2 items-start">
                      <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-sm">{userBio}</p>
                      </div>
                    </div>
                  )}
                  {!userProfession && !userCity && !userBio && (
                    <p className="text-sm text-muted-foreground text-center py-2">No additional profile information yet. Click Edit Profile to add details.</p>
                  )}
                </div>
                
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

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-md max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop Photo</DialogTitle>
            <DialogDescription>Adjust and crop your photo</DialogDescription>
          </DialogHeader>
          
          {imageToCrop && (
            <div className="space-y-4 pb-4">
              <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 min-w-0"
                    data-testid="slider-zoom"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0 sticky bottom-0 bg-background pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCropDialogOpen(false);
                    setImageToCrop('');
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    if (galleryInputRef.current) {
                      galleryInputRef.current.value = '';
                    }
                  }}
                  className="flex-1"
                  data-testid="button-cancel-crop"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCropConfirm}
                  className="flex-1"
                  data-testid="button-confirm-crop"
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
