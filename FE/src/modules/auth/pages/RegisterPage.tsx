import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { OtpInput } from '@/shared/components/ui/otp-input';
import { AuthLayout } from '../components/AuthLayout';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
  });
  const navigate = useNavigate();

  const onRegisterSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await authApi.register({ email: values.email, password: values.password });
      setEmail(values.email);
      setStep('verify');
      toast.success('OTP sent to your email.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  });

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await authApi.verifyRegisterOtp(email, otp);
      toast.success('Account verified! You can login now.');
      navigate('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid OTP'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const renderRegisterForm = () => (
    <form className="space-y-5" onSubmit={onRegisterSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" className="pl-9" placeholder="name@example.com" {...register('email')} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" className="pl-9" type="password" placeholder="At least 6 characters" {...register('password')} />
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Register and Send OTP
      </Button>
    </form>
  );

  const renderVerifyForm = () => (
    <form className="space-y-5" onSubmit={onVerifySubmit}>
      <OtpInput value={otp} onChange={setOtp} />
      <Button className="w-full" type="submit" disabled={otp.length !== 6 || loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Verify OTP
      </Button>
      <button
        type="button"
        onClick={() => { setStep('register'); setOtp(''); }}
        className="block w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
      >
        Back to register
      </button>
    </form>
  );

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{step === 'register' ? 'Create account' : 'Confirm OTP'}</CardTitle>
          <CardDescription>
            {step === 'register'
              ? 'Register with your email and password.'
              : 'Enter the 6-digit code sent to your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'register' ? renderRegisterForm() : renderVerifyForm()}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};