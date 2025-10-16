const { Ollama } = require('ollama');

async function testOllama() {
  console.log('Testing Ollama connection...');
  
  try {
    const ollama = new Ollama({
      host: 'http://localhost:11434',
      timeout: 10000
    });
    
    console.log('1. Listing models...');
    const models = await ollama.list();
    console.log('Available models:', models.models.map(m => m.name));
    
    console.log('2. Testing generation...');
    const response = await ollama.generate({
      model: 'llama3.1:8b',
      prompt: 'What is accounting?',
      stream: false,
      options: {
        temperature: 0.7,
        max_tokens: 100
      }
    });
    
    console.log('3. Response received:');
    console.log(response.response);
    
    console.log('✅ Ollama test successful!');
    
  } catch (error) {
    console.error('❌ Ollama test failed:', error.message);
  }
}

testOllama();
