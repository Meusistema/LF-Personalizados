# Instruções para rodar como Aplicativo Desktop (Electron)

Este projeto foi configurado para rodar como um aplicativo desktop profissional usando Electron.

## Pré-requisitos
Certifique-se de ter o **Node.js** instalado em seu computador.

## Como Iniciar o Aplicativo (Desenvolvimento)
Para rodar o aplicativo localmente enquanto desenvolve:

1. Abra o terminal na pasta do projeto.
2. Certifique-se de que as dependências estão instaladas:
   ```bash
   npm install
   ```
3. Execute o comando de desenvolvimento:
   ```bash
   npm run electron:dev
   ```
   *Este comando irá iniciar o servidor Vite e, assim que estiver pronto, abrirá a janela do Electron automaticamente.*

## Como Gerar o Executável (.exe)
Para criar a versão de distribuição (App Portátil):

1. Execute o comando de build:
   ```bash
   npm run electron:build
   ```
2. Após o término, o executável estará disponível na pasta `/dist_electron`.
3. Você encontrará um arquivo chamado `LukasFe3D Hub Setup 1.0.0.exe`.

## Detalhes da Configuração
- **Correção de Sincronização**: O sistema agora carrega os arquivos locais da pasta `/dist` em vez de buscar um site externo, garantindo que suas mudanças no AI Studio reflitam no instalador.
- **Build Automático**: O comando `electron:build` foi atualizado para sempre compilar o frontend antes de gerar o instalador.
- **Integração de Impressão**: O sistema já está preparado para se comunicar com o processo principal do Electron para funções avançadas no futuro.
