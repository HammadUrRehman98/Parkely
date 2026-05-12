import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyEmailOtp, resendEmailOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const prefilledEmail = new URLSearchParams(location.search).get('email');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmailOtp(email || prefilledEmail || '', otp);
      toast({ title: 'Email verified', description: 'Your account is now active.' });
      navigate('/dashboard');
    } catch (error) {
      toast({ title: 'Verification failed', description: error instanceof Error ? error.message : 'Invalid code', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email && !prefilledEmail) {
      return;
    }
    try {
      await resendEmailOtp(email || prefilledEmail || '');
      toast({ title: 'Code sent', description: 'A new verification code was sent to your email.' });
    } catch (error) {
      toast({ title: 'Could not resend code', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  };

  const prefilledOtp = new URLSearchParams(location.search).get('otp') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Enter the 6-digit code we sent to your inbox.</CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email || prefilledEmail || ''} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>OTP</Label>
              <InputOTP maxLength={6} value={otp || prefilledOtp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify Email'}</Button>
            <Button type="button" variant="secondary" className="w-full" onClick={handleResend}>Resend Code</Button>
            {prefilledOtp && (
              <p className="text-sm text-muted-foreground text-center">
                Your local verification code is prefilled from signup.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Back to <Link to="/login" className="text-primary hover:underline">Sign In</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default VerifyEmail;
