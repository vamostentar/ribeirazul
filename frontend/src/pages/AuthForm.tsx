import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, Phone, User, UserCheck } from 'lucide-react';
import { useState } from 'react';

type AuthMode = 'login' | 'register';

export default function AuthForm() {
  const { login, register, complete2FA, requiresTwoFactor, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(loginData.email, loginData.password, loginData.rememberMe);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Falha no login');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      const registerPayload: any = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        phone: registerData.phone,
        password: registerData.password,
      };
      
      // Only include username if it's not empty
      if (registerData.username && registerData.username.trim()) {
        registerPayload.username = registerData.username;
      }
      
      await register(registerPayload);
      setSuccess('Registro realizado com sucesso! Verifique seu email para ativar a conta.');
      setMode('login');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Falha no registro');
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await complete2FA(twoFactorCode);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Código 2FA inválido');
    }
  };

  const resetForms = () => {
    setLoginData({ email: '', password: '', rememberMe: false });
    setRegisterData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setTwoFactorCode('');
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForms();
  };

  if (requiresTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <Card variant="elevated" className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verificação em Duas Etapas</h1>
            <p className="text-gray-600 mt-2">Digite o código de 6 dígitos do seu autenticador</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handle2FA} className="space-y-4">
            <Input
              label="Código de Verificação"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className="text-center text-lg tracking-widest"
              required
            />
            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {loading ? 'Verificando...' : 'Verificar Código'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {mode === 'login' ? (
              <Lock className="w-6 h-6 text-blue-600" />
            ) : (
              <UserCheck className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === 'login' 
              ? 'Entre na sua conta para continuar' 
              : 'Crie sua conta para começar'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              fullWidth
              required
            />
            
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              fullWidth
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={loginData.rememberMe}
                  onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Lembrar sessão
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome"
                type="text"
                placeholder="João"
                value={registerData.firstName}
                onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Sobrenome"
                type="text"
                placeholder="Silva"
                value={registerData.lastName}
                onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            </div>

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              fullWidth
              required
            />

            <Input
              label="Nome de usuário (opcional)"
              type="text"
              placeholder="joao.silva"
              value={registerData.username}
              onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
              fullWidth
            />

            <Input
              label="Telefone"
              type="tel"
              placeholder="+55 11 99999-9999"
              value={registerData.phone}
              onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
              leftIcon={<Phone className="w-4 h-4" />}
              fullWidth
              required
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              fullWidth
              required
            />

            {registerData.password && (
              <PasswordStrength password={registerData.password} />
            )}

            <Input
              label="Confirmar Senha"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Digite a senha novamente"
              value={registerData.confirmPassword}
              onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              fullWidth
              required
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
