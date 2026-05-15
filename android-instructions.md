# Guia de Geração de APK - LukasFe3D Hub

Este guia explica como gerar o APK do sistema para Android sem depender da Google Play Store.

## 1. O que já existia no projeto
- Dependências do Capacitor instaladas.
- Pasta `android/` inicializada.
- Identificadores básicos configurados (`com.lukasfe3d.hub`).

## 2. O que foi ajustado/criado
- **Permissões**: Adicionada permissão de Câmera no `AndroidManifest.xml`.
- **Configuração**: Alterado `capacitor.config.ts` para carregar arquivos locais (dist) em vez de uma URL externa.
- **Versão**: Sincronizada a versão do Android com o `package.json` (1.0.0).
- **Scripts**: Adicionados comandos de build direto no `package.json`.

## 3. Comandos para o Terminal

Antes de rodar, certifique-se de ter o **Android Studio** e o **Java SDK** instalados na sua máquina local.

### Sincronizar o projeto (Web -> Android)
```bash
npm run mobile:sync
```

### Abrir no Android Studio
```bash
npm run mobile:open
```

### Gerar APK de Teste (Debug) via Terminal
```bash
npm run mobile:build:apk
```
*O arquivo será gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`*

## 4. Passo a Passo para Gerar APK Final (Release)

Para uma versão final que você pode distribuir para clientes:

1. **Gere os arquivos do sistema:**
   ```bash
   npm run build
   ```
2. **Sincronize com o Android:**
   ```bash
   npx cap sync android
   ```
3. **Abra o Android Studio:**
   ```bash
   npx cap open android
   ```
4. **No Android Studio:**
   - Vá em **Build** > **Generate Signed Bundle / APK...**
   - Escolha **APK** e clique em **Next**.
   - Se ainda não tiver uma chave (`Key store path`), clique em **Create new...** e preencha os dados (guarde bem essa senha!).
   - Escolha a variante **release**.
   - Clique em **Finish**.
5. **Localize o APK:**
   - O Android Studio mostrará um balão no canto inferior direito. Clique em `locate` para encontrar seu arquivo `app-release.apk`.

## 5. Dicas para Atualizações Futuras
- Sempre aumente o `versionCode` no arquivo `android/app/build.gradle` a cada nova versão.
- O `versionName` deve acompanhar o `version` do `package.json`.
- Você poderá usar o GitHub Releases para subir esses APKs e, futuramente, implementar um sistema de download automático dentro do app.
