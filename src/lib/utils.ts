
export async function uploadToServer(file: File, category: 'greeting' | 'customer' | 'product' | 'logo') {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch(`/api/upload?category=${category}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Falha no upload');
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Erro no upload:', error);
    // Fallback para Base64 se o servidor falhar
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}
