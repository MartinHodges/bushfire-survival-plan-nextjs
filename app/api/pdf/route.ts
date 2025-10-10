import { NextRequest } from 'next/server';
import { log } from '@/utils/logging';

export async function POST(request: NextRequest) {
  try {
    const html = await request.text();
    const pdfServiceUrl = `${process.env.PDF_SERVICE_URL || 'http://localhost:3080/generate-pdf'}`;
    
    const response = await fetch(pdfServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: html
    });
    
    log(`PDF service response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`PDF service error: ${errorText}`);
      return new Response(`PDF generation failed: ${errorText}`, { status: 500 });
    }
    
    const pdfBuffer = await response.arrayBuffer();
    log(`PDF buffer size: ${pdfBuffer.byteLength}`);
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="bushfire-plan.pdf"'
      }
    });
  } catch (error) {
    log(`PDF API error: ${JSON.stringify(error)}`);
    return new Response(`PDF generation error: ${error}`, { status: 500 });
  }
}