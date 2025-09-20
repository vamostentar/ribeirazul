# Arquitetura Modular do API Gateway - Upload de Imagens

## 📋 Resumo Executivo

Esta documentação descreve a implementação de uma arquitetura modular black box para o proxy de uploads de imagens no API Gateway, seguindo os princípios de desenvolvimento de Eskil Steenberg para sistemas que mantêm velocidade de desenvolvimento independentemente da escala.

## 🎯 Objetivos da Arquitetura

### **Princípios Fundamentais:**
- **Modularidade Black Box**: Cada módulo esconde detalhes de implementação
- **Interfaces Claras**: APIs bem definidas entre componentes
- **Testabilidade**: Cada módulo pode ser testado independentemente
- **Substituibilidade**: Qualquer módulo pode ser substituído sem afetar outros
- **Debuggabilidade**: Problemas são fáceis de localizar e corrigir

## 🏗️ Estrutura da Arquitetura

```
backend/api-gateway/src/
├── interfaces/
│   └── stream-proxy.interface.ts      # Contratos black box
├── implementations/
│   ├── stream-proxy.implementation.ts  # Proxy principal
│   ├── multipart-validator.implementation.ts
│   └── stream-error-handler.implementation.ts
├── factories/
│   └── stream-proxy.factory.ts        # Factory para instâncias
├── config/
│   └── performance.config.ts          # Configurações de performance
└── test/
    └── stream-proxy.integration.test.ts
```

## 🔧 Componentes Modulares

### **1. StreamProxy (Núcleo)**
```typescript
interface StreamProxy {
  proxyStream(request: StreamProxyRequest, config: StreamProxyConfig): Promise<StreamProxyResponse>;
  canProxy(request: StreamProxyRequest): boolean;
  getDynamicTimeout(contentLength?: number): number;
}
```

**Responsabilidades:**
- Proxy de streams HTTP
- Gestão de timeouts dinâmicos
- Coordenação de retries
- Validação de requests

### **2. MultipartStreamValidator**
```typescript
interface MultipartStreamValidator {
  isValidMultipart(headers: StreamProxyHeaders): boolean;
  extractBoundary(contentType: string): string | undefined;
  hasValidBoundary(contentType: string): boolean;
  validateUploadHeaders(headers: StreamProxyHeaders): ValidationResult;
}
```

**Responsabilidades:**
- Validação de headers multipart
- Extração e validação de boundaries
- Verificação de formato de conteúdo

### **3. StreamErrorHandler**
```typescript
interface StreamErrorHandler {
  handleStreamError(error: Error, context: ErrorContext): StreamProxyError;
  isRetryableError(error: Error): boolean;
  getRetryDelay(error: StreamProxyError, attempt: number): number;
}
```

**Responsabilidades:**
- Tratamento padronizado de erros
- Classificação de erros retryables
- Cálculo de delays de retry

### **4. PerformanceConfigFactory**
```typescript
class PerformanceConfigFactory {
  static createDefaultConfig(): PerformanceConfig;
  static createUploadConfig(): PerformanceConfig;
  static createHighLoadConfig(): PerformanceConfig;
}
```

**Responsabilidades:**
- Criação de configurações otimizadas
- Adaptação baseada no contexto
- Gestão de parâmetros de performance

## 📊 Fluxo de Dados

### **Upload de Imagem - Fluxo Completo:**

```mermaid
graph TB
    A[Frontend Request] --> B[API Gateway]
    B --> C[StreamProxy.canProxy()]
    C --> D[MultipartValidator.validateUploadHeaders()]
    D --> E[StreamProxy.proxyStream()]
    E --> F[Properties Service]
    F --> G[Response Processing]
    G --> H[Frontend Response]
    
    I[Error Handling] --> J[StreamErrorHandler]
    J --> K[Retry Logic]
    K --> E
    
    L[Performance Monitor] --> M[AdaptiveConfigManager]
    M --> N[Dynamic Config Adjustment]
```

### **Tratamento de Erros:**

1. **Erro Detectado** → StreamErrorHandler.handleStreamError()
2. **Classificação** → isRetryableError()
3. **Retry Decision** → getRetryDelay()
4. **Retry Execution** → StreamProxy com nova tentativa

## 🚀 Vantagens da Arquitetura

### **1. Manutenibilidade**
- **Separação Clara**: Cada módulo tem uma responsabilidade específica
- **Baixo Acoplamento**: Módulos comunicam apenas através de interfaces
- **Alta Coesão**: Funcionalidades relacionadas agrupadas

### **2. Testabilidade**
- **Testes Unitários**: Cada interface pode ser testada independentemente
- **Mocks Fáceis**: Interfaces permitem substituição por mocks
- **Testes de Integração**: Validação do fluxo completo

### **3. Performance**
- **Timeouts Dinâmicos**: Ajustados baseado no tamanho do ficheiro
- **Retry Inteligente**: Apenas erros retryables são retentados
- **Monitorização**: Performance tracking e ajustes automáticos

### **4. Debuggabilidade**
- **Logs Estruturados**: Cada módulo produz logs específicos
- **Rastreamento de Erros**: Contexto completo preservado
- **Isolamento de Problemas**: Fácil identificação do módulo com problema

## ⚙️ Configurações de Performance

### **Configuração Padrão:**
```typescript
{
  baseTimeout: 30000,      // 30 segundos
  timeoutPerMb: 10000,     // 10 segundos por MB
  maxTimeout: 300000,      // 5 minutos máximo
  maxRetries: 3,
  bufferSize: 64 * 1024    // 64KB
}
```

### **Configuração para Uploads:**
```typescript
{
  baseTimeout: 60000,      // 1 minuto base
  timeoutPerMb: 15000,     // 15 segundos por MB
  maxTimeout: 600000,      // 10 minutos máximo
  maxRetries: 2,
  bufferSize: 256 * 1024   // 256KB
}
```

## 🧪 Estratégia de Testes

### **1. Testes Unitários**
- **MultipartValidator**: Validação de boundaries e headers
- **StreamErrorHandler**: Classificação de erros e delays
- **PerformanceConfig**: Cálculo de timeouts dinâmicos

### **2. Testes de Integração**
- **StreamProxy**: Fluxo completo de proxy
- **Error Scenarios**: Diferentes tipos de erro
- **Performance**: Timeouts e retries

### **3. Testes de Carga**
- **Concurrent Uploads**: Múltiplos uploads simultâneos
- **Large Files**: Ficheiros de diferentes tamanhos
- **Network Issues**: Simulação de problemas de rede

## 🔍 Monitorização e Debugging

### **Logs Estruturados:**
```typescript
console.log('📤 StreamProxy: Proxying POST to http://properties:8082', {
  timeout: 45000,
  contentType: 'multipart/form-data',
  contentLength: 2048576,
  hasBody: true
});
```

### **Métricas de Performance:**
- **Response Times**: Tempo de resposta por endpoint
- **Error Rates**: Taxa de erro por tipo
- **Retry Statistics**: Frequência e sucesso de retries

### **Health Checks:**
- **Endpoint Availability**: Verificação de disponibilidade
- **Performance Degradation**: Detecção de degradação
- **Configuration Adaptation**: Ajustes automáticos

## 📈 Escalabilidade

### **Horizontal Scaling:**
- **Stateless Design**: Sem estado partilhado entre instâncias
- **Load Balancing**: Distribuição automática de carga
- **Connection Pooling**: Reutilização de conexões

### **Vertical Scaling:**
- **Adaptive Configuration**: Ajustes baseados na carga
- **Buffer Optimization**: Tamanhos de buffer dinâmicos
- **Memory Management**: Gestão eficiente de memória

## 🛠️ Manutenção e Evolução

### **Substituição de Módulos:**
1. **Criar Nova Implementação** que implementa a mesma interface
2. **Testar Independentemente** a nova implementação
3. **Substituir na Factory** sem afetar outros módulos
4. **Verificar Integração** através dos testes existentes

### **Adição de Funcionalidades:**
1. **Estender Interface** se necessário
2. **Implementar Nova Funcionalidade** no módulo apropriado
3. **Adicionar Testes** para cobertura completa
4. **Documentar Mudanças** e impactos

### **Debugging de Problemas:**
1. **Identificar Módulo** através dos logs estruturados
2. **Isolar Problema** testando o módulo específico
3. **Corrigir Implementação** sem afetar interfaces
4. **Validar Correção** através dos testes

## 🎯 Benefícios Alcançados

### **Para Desenvolvimento:**
- ✅ **Velocidade Mantida**: Novos recursos não tornam o sistema mais lento
- ✅ **Debugging Eficiente**: Problemas localizados rapidamente
- ✅ **Testes Confiáveis**: Cobertura completa e testes rápidos

### **Para Operações:**
- ✅ **Performance Otimizada**: Timeouts e retries inteligentes
- ✅ **Monitorização Clara**: Métricas estruturadas e alertas
- ✅ **Manutenção Simples**: Módulos substituíveis independentemente

### **Para o Negócio:**
- ✅ **Uploads Confiáveis**: Tratamento robusto de erros
- ✅ **Performance Consistente**: Adaptação automática à carga
- ✅ **Escalabilidade**: Crescimento sem degradação

---

**Conclusão**: Esta arquitetura modular black box garante que o sistema de upload de imagens seja robusto, performante e facilmente manutenível, seguindo os princípios de desenvolvimento que mantêm a velocidade de desenvolvimento independentemente da complexidade do sistema.

