import { FileValidationService } from './file-validation.service';
import { BadRequestException } from '@nestjs/common';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(() => {
    service = new FileValidationService();
  });

  it('should correctly detect magic numbers for PDF files', () => {
    const pdfBuffer = Buffer.concat([Buffer.from('%PDF-1.4 header text'), Buffer.alloc(100)]);
    expect(service.detectFileType(pdfBuffer)).toEqual('pdf');
  });

  it('should detect file type mismatch if text file is renamed to pdf', () => {
    const textBufferAsPdf = {
      originalname: 'malicious.pdf',
      buffer: Buffer.from('This is simple text file not a PDF')
    };

    expect(() => service.validateFile(textBufferAsPdf)).toThrow(BadRequestException);
  });

  it('should enforce size limit rules', () => {
    const oversizedPdf = {
      originalname: 'huge.pdf',
      buffer: Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(6 * 1024 * 1024)]) // 6MB
    };

    expect(() => service.validateFile(oversizedPdf)).toThrow(BadRequestException);
  });

  it('should reject script injection in text files', () => {
    const scriptText = {
      originalname: 'notes.txt',
      buffer: Buffer.from('<script>alert("xss")</script>')
    };

    expect(() => service.validateFile(scriptText)).toThrow(BadRequestException);
  });
});
