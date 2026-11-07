/**
 * GALAXIA ULTRA • Firebase Auth & Cloud Firestore Service
 * Handles Google Authentication (signInWithPopup), connection validation,
 * structured FirestoreErrorInfo error handling, and Cloud World Saves.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SaveSlot } from '../contracts/schemas';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore on boot as required by architecture rules.
 */
export async function validateFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

validateFirestoreConnection();

export interface CommanderAuthUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isLocalFallback?: boolean;
}

export function subscribeToAuthChanges(
  callback: (user: CommanderAuthUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (fbUser: User | null) => {
    if (fbUser) {
      callback({
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Commandeur Impérial',
        email: fbUser.email,
        photoURL: fbUser.photoURL,
        isLocalFallback: false,
      });
    } else {
      callback(null);
    }
  });
}

export async function signInWithGoogleCommander(
  worldName: string
): Promise<CommanderAuthUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  await syncCommanderProfile(user, 'Haut-Archonte Stellaire', worldName);

  return {
    uid: user.uid,
    displayName: user.displayName || 'Commandeur Impérial',
    email: user.email,
    photoURL: user.photoURL,
    isLocalFallback: false,
  };
}

export async function signOutCommander(): Promise<void> {
  await signOut(auth);
}

export async function syncCommanderProfile(
  user: User,
  imperialTitle: string,
  lastActiveWorldName: string
): Promise<void> {
  const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  const safeDisplayName = (user.displayName || 'Commandeur Impérial').slice(0, 80);
  const safePhoto = (user.photoURL || '').slice(0, 500);
  const safeTitle = (imperialTitle || 'Archonte').slice(0, 80);
  const safeWorld = (lastActiveWorldName || 'Aethelgard Prime').slice(0, 80);

  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: safeUid,
        displayName: safeDisplayName,
        photoURL: safePhoto,
        imperialTitle: safeTitle,
        lastActiveWorldName: safeWorld,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userRef,
        {
          displayName: safeDisplayName,
          photoURL: safePhoto,
          imperialTitle: safeTitle,
          lastActiveWorldName: safeWorld,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface CloudWorldSaveSummary {
  saveId: string;
  ownerId: string;
  name: string;
  worldName: string;
  turnNumber: number;
  activePresetId: string;
  activeZoneId: string;
  payload: SaveSlot;
}

export async function saveWorldSlotToCloud(
  slot: SaveSlot,
  activeZoneId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const cleanSlotId = slot.slotId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const saveId = `${currentUser.uid}_${cleanSlotId}`.slice(0, 128);
  const path = `worldSaves/${saveId}`;
  const saveRef = doc(db, 'worldSaves', saveId);

  const safeName = (slot.label || 'Chronique Impériale').slice(0, 80);
  const safeWorldName = (slot.config.worldName || 'Aethelgard').slice(0, 80);
  const safePresetId = (slot.config.presetId || 'terran_eden').slice(0, 64);
  const safeZoneId = (activeZoneId || 'zone_aethelgard').slice(0, 64);
  const safeTurn = Math.max(1, Math.min(100000, Math.floor(slot.turnNumber || 1)));

  try {
    const existing = await getDoc(saveRef);
    if (!existing.exists()) {
      await setDoc(saveRef, {
        saveId,
        ownerId: currentUser.uid,
        name: safeName,
        worldName: safeWorldName,
        turnNumber: safeTurn,
        activePresetId: safePresetId,
        activeZoneId: safeZoneId,
        payload: slot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        saveRef,
        {
          name: safeName,
          worldName: safeWorldName,
          turnNumber: safeTurn,
          activePresetId: safePresetId,
          activeZoneId: safeZoneId,
          payload: slot,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCloudWorldSaves(): Promise<CloudWorldSaveSummary[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const path = 'worldSaves';
  try {
    const q = query(
      collection(db, 'worldSaves'),
      where('ownerId', '==', currentUser.uid)
    );
    const snap = await getDocs(q);
    const results: CloudWorldSaveSummary[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.payload) {
        results.push({
          saveId: data.saveId,
          ownerId: data.ownerId,
          name: data.name,
          worldName: data.worldName,
          turnNumber: data.turnNumber,
          activePresetId: data.activePresetId,
          activeZoneId: data.activeZoneId,
          payload: data.payload as SaveSlot,
        });
      }
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteCloudWorldSave(saveId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const path = `worldSaves/${saveId}`;
  try {
    await deleteDoc(doc(db, 'worldSaves', saveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
