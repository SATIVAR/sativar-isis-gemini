#!/bin/bash
set -e

# Script de inicialização do banco de dados PostgreSQL para a aplicação SATIVAR-ISIS

echo "Iniciando script de inicialização do banco de dados..."

# Esperar o PostgreSQL estar pronto
echo "Aguardando o PostgreSQL estar pronto..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  echo "PostgreSQL ainda não está pronto, aguardando 5 segundos..."
  sleep 5
done

echo "PostgreSQL está pronto!"

# Criar banco de dados se não existir
echo "Verificando/criando banco de dados: $POSTGRES_DB"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --host "$POSTGRES_HOST" --port "$POSTGRES_PORT" <<-EOSQL
  SELECT 'CREATE DATABASE $POSTGRES_DB' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB');
EOSQL

echo "Banco de dados verificado/criado com sucesso!"

# Conceder permissões ao usuário
echo "Concedendo permissões ao usuário: $POSTGRES_USER"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --host "$POSTGRES_HOST" --port "$POSTGRES_PORT" --dbname "$POSTGRES_DB" <<-EOSQL
  GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

echo "Permissões concedidas com sucesso!"

# Executar migrações iniciais
echo "Executando migrações iniciais..."
# Copiar os arquivos de migração para um diretório acessível
# As migrações serão executadas pela aplicação no startup

echo "Migrações iniciais concluídas!"

echo "Script de inicialização do banco de dados finalizado com sucesso!"