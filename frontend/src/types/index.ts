export interface Achievement {
  id: string;
  title: string;
  description?: string;
  year?: number;
  proofImageUrl?: string;
  proofLink?: string;
  isVerified: boolean;
  createdAt: string;
  exhibitor?: Exhibitor | null;
}

export interface Exhibitor {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string | null;
  bio?: string | null;
  achievements?: Achievement[];
}

export interface ArtworkContributor {
  exhibitorId: string;
  exhibitor?: { id: string; name: string };
}

export interface ArtworkMedia {
  type: 'image' | 'video';
  url: string;
}

export interface Artwork {
  id: string;
  title: string;
  type: string;
  yearCreated?: number;
  style?: string;
  description?: string;
  price?: number;
  status: string;
  imageUrl?: string;
  media?: ArtworkMedia[];
  attributes?: Record<string, any>;
  createdAt: string;
  exhibitor?: Exhibitor | null;
  contributors?: ArtworkContributor[];
}

export interface SoldArtwork {
  id: string;
  collectorId: string;
  artworkId: string;
  artwork: Artwork;
  artworkTitle: string;
  salePrice: number;
  saleDate: string;
  notes?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  senderRole: 'collector' | 'exhibitor';
  exhibitorId: string;
  collectorId: string;
  artworkId?: string | null;
  artworkType?: string | null;
  artwork?: {
    id: string;
    title: string;
    imageUrl?: string | null;
  } | null;
  createdAt: string;
  collector?: { id: string; name: string; profilePicture?: string | null };
  exhibitor?: { id: string; name: string; profilePicture?: string | null };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'collectors' | 'exhibitors';
  createdAt: string;
}

export type View = 'landing' | 'login' | 'gallery';

export interface Report {
  id: string;
  userId: string;
  userRole: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'exhibitor' | 'collector' | string;
  profilePicture?: string | null;
  bio?: string | null;
  theme?: string;
  isPendingExhibitor?: boolean;
  isDualRole?: boolean;
}
