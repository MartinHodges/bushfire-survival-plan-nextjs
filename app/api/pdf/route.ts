import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const html = await request.text();
    const pdfServiceUrl = `${process.env.PDF_SERVICE_URL || 'http://localhost:3080/generate-pdf'}`;
    
    console.log('PDF service URL:', pdfServiceUrl);
    console.log('HTML length:', html.length);
    
    const response = await fetch(pdfServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: html
    });
    
    console.log('PDF service response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF service error:', errorText);
      return new Response(`PDF generation failed: ${errorText}`, { status: 500 });
    }
    
    const pdfBuffer = await response.arrayBuffer();
    console.log('PDF buffer size:', pdfBuffer.byteLength);
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="bushfire-plan.pdf"'
      }
    });
  } catch (error) {
    console.error('PDF API error:', error);
    return new Response(`PDF generation error: ${error}`, { status: 500 });
  }
}