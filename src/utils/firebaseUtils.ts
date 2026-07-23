import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

export const isFirebaseConfigured = () => firebase.apps.length > 0;

export const getFirebaseMessaging = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return messaging();
};
