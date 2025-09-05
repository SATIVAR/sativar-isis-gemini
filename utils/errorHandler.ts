export enum ErrorCode {
  // Connection Errors
  CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'DB_CONNECTION_TIMEOUT',
  AUTHENTICATION_FAILED = 'DB_AUTH_FAILED',
  
  // Migration Errors
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  MIGRATION_ROLLBACK_FAILED = 'MIGRATION_ROLLBACK_FAILED',
  SCHEMA_CONFLICT = 'SCHEMA_CONFLICT',
  
  // Data Errors
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // System Errors
  BACKUP_FAILED = 'BACKUP_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Additional error codes
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
  TABLE_NOT_FOUND = 'TABLE_NOT_FOUND',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR'
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: string;
  public readonly details?: string;

  constructor(code: ErrorCode, message: string, context?: string, details?: any) {
    super(message);
    this.code = code;
    this.context = context;
    this.details = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined;

    // Maintains the correct stack trace for our custom error class
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    // Ensures the class name is 'AppError'
    this.name = 'AppError';
  }
}

export class ErrorHandler {
  /**
   * Parses an unknown type error and returns a standardized AppError object.
   * @param error The error to be parsed (unknown type).
   * @param context An optional string that provides context about the error.
   * @returns An AppError object with a standardized error code and message.
   */
  static handle(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    let errorCode = ErrorCode.UNKNOWN_ERROR;
    let message = 'Ocorreu um erro inesperado. Por favor, tente novamente.';
    const details = error instanceof Error ? error.message : String(error);

    if (error instanceof Error) {
      // Checks if the error is a PostgreSQL error (which has the 'code' property)
      if ('code' in error) {
        const pgError = error as any; // Type assertion to access specific pg properties
        switch (pgError.code) {
          case '28P01':
            errorCode = ErrorCode.CONNECTION_FAILED;
            message = 'Falha na autenticação com o banco de dados. Verifique as credenciais.';
            break;
          case '3D000':
            errorCode = ErrorCode.DATABASE_NOT_FOUND;
            message = 'O banco de dados especificado não existe.';
            break;
          case '42P01':
            errorCode = ErrorCode.TABLE_NOT_FOUND;
            message = 'Uma tabela necessária não foi encontrada no banco de dados.';
            break;
          case '23505':
            errorCode = ErrorCode.UNIQUE_CONSTRAINT_VIOLATION;
            message = 'Violação de restrição única. O registro já existe.';
            break;
          default:
            errorCode = ErrorCode.DB_QUERY_ERROR;
            message = 'Falha ao executar uma consulta no banco de dados.';
            break;
        }
      }
      
      // Check for network errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorCode = ErrorCode.CONNECTION_FAILED;
        message = 'Não foi possível conectar ao banco de dados. Verifique a conexão de rede e as configurações.';
      }
      
      // Check for timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorCode = ErrorCode.CONNECTION_TIMEOUT;
        message = 'Tempo limite de conexão excedido. Verifique a conexão de rede.';
      }
    }

    return new AppError(errorCode, message, context, details);
  }

  /**
   * Provides suggestions to fix an error based on its code.
   * @param errorCode The error code of an AppError object.
   * @returns A string with suggestions to resolve the error.
   */
  static getErrorSuggestions(errorCode: ErrorCode): string {
    switch (errorCode) {
      case ErrorCode.CONNECTION_FAILED:
        return 'Verifique se o host, porta, nome de usuário e senha do banco de dados estão corretos. Certifique-se de que o servidor de banco de dados está em execução e acessível.';
      case ErrorCode.CONNECTION_TIMEOUT:
        return 'Verifique sua conexão de rede. O servidor pode estar inacessível ou sobrecarregado.';
      case ErrorCode.DATABASE_NOT_FOUND:
        return 'Verifique se o nome do banco de dados está correto e se o banco de dados foi criado no servidor.';
      case ErrorCode.TABLE_NOT_FOUND:
        return 'Execute as migrações do banco de dados para criar todas as tabelas necessárias antes de iniciar o aplicativo.';
      case ErrorCode.MIGRATION_FAILED:
        return 'Revise os logs de migração para identificar o script que falhou. Corrija o script e tente executar as migrações novamente.';
      case ErrorCode.BACKUP_FAILED:
        return 'Certifique-se de que o aplicativo tem permissões de gravação no diretório de backup e que há espaço em disco suficiente disponível.';
      case ErrorCode.UNIQUE_CONSTRAINT_VIOLATION:
        return 'Os dados que você está tentando salvar entram em conflito com uma entrada existente. Verifique os dados de entrada para duplicatas.';
      case ErrorCode.DB_QUERY_ERROR:
        return 'Revise a consulta SQL que falhou e a lógica do aplicativo para identificar o problema. Verifique se há erros de sintaxe ou falhas lógicas.';
      case ErrorCode.AUTHENTICATION_FAILED:
        return 'Verifique se o nome de usuário e senha estão corretos. Certifique-se de que o usuário tem permissões adequadas.';
      default:
        return 'Não há sugestões específicas disponíveis para este erro. Verifique os logs do aplicativo para mais detalhes.';
    }
  }
}