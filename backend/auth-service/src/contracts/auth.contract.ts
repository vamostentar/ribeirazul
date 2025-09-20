import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshResponse,
  ChangePasswordRequest,
  TwoFactorSetup
} from '@/types/auth';
import { RequestContext } from '@/types/common';

/**
 * Contrato para o serviço de autenticação
 * Define a interface pública que outros módulos podem usar
 */
export interface AuthServiceContract {
  /**
   * Autentica usuário com email e senha
   */
  login(credentials: LoginRequest, context: RequestContext): Promise<LoginResponse>;

  /**
   * Completa autenticação de dois fatores
   */
  complete2FA(tempToken: string, twoFactorCode: string, context: RequestContext): Promise<LoginResponse>;

  /**
   * Atualiza tokens de acesso usando refresh token
   */
  refreshTokens(request: RefreshTokenRequest, context: RequestContext): Promise<RefreshResponse>;

  /**
   * Faz logout do usuário
   */
  logout(sessionToken: string, context: RequestContext): Promise<void>;

  /**
   * Altera senha do usuário
   */
  changePassword(userId: string, request: ChangePasswordRequest, context: RequestContext): Promise<void>;

  /**
   * Habilita autenticação de dois fatores
   */
  enable2FA(userId: string, context: RequestContext): Promise<TwoFactorSetup>;

  /**
   * Confirma configuração de 2FA
   */
  confirm2FA(userId: string, secret: string, token: string, context: RequestContext): Promise<void>;

  /**
   * Desabilita autenticação de dois fatores
   */
  disable2FA(userId: string, password: string, token: string, context: RequestContext): Promise<void>;
}

/**
 * Contrato para o serviço de usuários
 */
export interface UserServiceContract {
  /**
   * Busca usuário por ID
   */
  findById(id: string): Promise<any>;

  /**
   * Busca usuários com paginação
   */
  findMany(pagination: any, filters?: any): Promise<any>;

  /**
   * Cria novo usuário
   */
  create(data: any, createdBy: string, context: RequestContext): Promise<any>;

  /**
   * Atualiza usuário
   */
  update(id: string, data: any, context: RequestContext, updatedBy?: string): Promise<any>;

  /**
   * Remove usuário (soft delete)
   */
  delete(id: string, deletedBy: string, context: RequestContext): Promise<void>;

  /**
   * Ativa usuário
   */
  activate(id: string, activatedBy: string, context: RequestContext): Promise<any>;

  /**
   * Desativa usuário
   */
  deactivate(id: string, deactivatedBy: string, context: RequestContext): Promise<any>;

  /**
   * Redefine senha do usuário
   */
  resetPassword(id: string, newPassword: string, resetBy: string, context: RequestContext): Promise<void>;

  /**
   * Verifica email do usuário
   */
  verifyEmail(id: string, verifiedBy: string, context: RequestContext): Promise<void>;

  /**
   * Busca usuários por query
   */
  search(query: string, limit?: number): Promise<any[]>;

  /**
   * Obtém estatísticas de usuários
   */
  getStatistics(): Promise<any>;
}

/**
 * Contrato para o serviço de sessões
 */
export interface SessionServiceContract {
  /**
   * Busca sessão por token
   */
  getSessionByToken(sessionToken: string): Promise<any>;

  /**
   * Busca sessões do usuário
   */
  getUserSessions(userId: string, pagination: any): Promise<any>;

  /**
   * Busca todas as sessões (admin)
   */
  getAllSessions(pagination: any, filters?: any): Promise<any>;

  /**
   * Encerra sessão
   */
  terminateSession(sessionId: string, userId: string, context: RequestContext): Promise<void>;

  /**
   * Encerra sessão (admin)
   */
  terminateSessionAdmin(sessionId: string, terminatedBy: string, context: RequestContext): Promise<void>;

  /**
   * Encerra todas as sessões do usuário
   */
  terminateAllUserSessions(userId: string, exceptSessionToken: string, context: RequestContext): Promise<number>;

  /**
   * Obtém estatísticas de sessões
   */
  getStatistics(): Promise<any>;

  /**
   * Limpa sessões expiradas
   */
  cleanupExpiredSessions(): Promise<number>;

  /**
   * Busca sessões suspeitas
   */
  getSuspiciousSessions(userId?: string): Promise<any[]>;
}

/**
 * Contrato para o serviço de roles
 */
export interface RoleServiceContract {
  /**
   * Busca role por ID
   */
  findById(id: string): Promise<any>;

  /**
   * Busca roles com paginação
   */
  findMany(pagination: any, filters?: any): Promise<any>;

  /**
   * Cria nova role
   */
  create(data: any, createdBy: string, context: RequestContext): Promise<any>;

  /**
   * Atualiza role
   */
  update(id: string, data: any, updatedBy: string, context: RequestContext): Promise<any>;

  /**
   * Remove role
   */
  delete(id: string, deletedBy: string, context: RequestContext): Promise<void>;

  /**
   * Busca usuários com determinada role
   */
  getUsersWithRole(roleId: string, pagination?: any): Promise<any>;

  /**
   * Atribui role a múltiplos usuários
   */
  assignToUsers(roleId: string, userIds: string[], assignedBy: string, context: RequestContext): Promise<number>;

  /**
   * Obtém permissões disponíveis
   */
  getAvailablePermissions(): Promise<any>;

  /**
   * Verifica uso da role
   */
  checkUsage(roleId: string): Promise<any>;
}
