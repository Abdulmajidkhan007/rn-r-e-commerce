import { Button } from 'react-native-paper';
import { useTranslation } from '@kidswear/i18n';
import { useGoogleSignIn } from '@/lib/googleSignIn';

interface GoogleSignInButtonProps {
  mode: 'login' | 'register';
}

export function GoogleSignInButton({ mode }: GoogleSignInButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const { promptAsync, ready } = useGoogleSignIn();

  return (
    <Button
      mode="outlined"
      icon="google"
      disabled={!ready}
      onPress={() => void promptAsync()}
      style={{ width: '100%' }}
    >
      {t(mode === 'login' ? 'auth.signInWithGoogle' : 'auth.signUpWithGoogle')}
    </Button>
  );
}
