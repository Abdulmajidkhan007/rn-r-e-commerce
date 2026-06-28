import { useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from '@kidswear/auth';
import { useTranslation } from '@kidswear/i18n';
import { signInWithGooglePopup } from '@/lib/googleSignIn';

interface GoogleSignInButtonProps {
  mode: 'login' | 'register';
}

export function GoogleSignInButton({ mode }: GoogleSignInButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogleCredential } = useAuthActions();
  const [loading, setLoading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    try {
      const credential = await signInWithGooglePopup();
      const ok = await loginWithGoogleCredential(credential);
      if (ok) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      fullWidth
      size="large"
      disabled={loading}
      startIcon={
        loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />
      }
      onClick={() => void handleClick()}
    >
      {t(mode === 'login' ? 'auth.signInWithGoogle' : 'auth.signUpWithGoogle')}
    </Button>
  );
}
