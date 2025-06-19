import { Injectable, Logger } from '@nestjs/common';

interface EmbedCodeOptions {
  recordingId: string;
  serverUrl: string;
  encodedContent: string;
  width?: string;
  height?: string;
}

@Injectable()
export class EmbedCodeService {
  generateEmbedCode(options: EmbedCodeOptions): string {
    const { recordingId, width, serverUrl, encodedContent } = options;
    const containerId = `step-guide-container-${recordingId}`;

    return this.generateEmbedHtml(containerId, encodedContent, serverUrl, width);
  }

  private generateEmbedHtml(
    containerId: string,
    encodedContent: string,
    serverUrl: string,
    widthValue: string = '100%',
  ): string {
    return `
        <div id='${containerId}' style="width: ${widthValue}; height: 100%; overflow: auto; border: 1px solid #eee;"></div>
        <script type="text/javascript">
            ${this.generateEmbedScript(containerId, encodedContent, serverUrl)}
        </script>`;
  }

  private generateEmbedScript(
    containerId: string,
    encodedContent: string,
    serverUrl: string,
  ): string {
    return `(function () {
        const stepGuideContent = atob("${encodedContent}");
        
        const iframe = document.createElement('iframe');
        iframe.frameBorder = 0;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        const container = document.getElementById('${containerId}');
        container.appendChild(iframe);

        const iframeDocument = iframe.contentWindow.document;
        iframeDocument.open();
        iframeDocument.write(stepGuideContent);
        iframeDocument.close();
        
        iframe.onload = function() {
            const links = iframe.contentWindow.document.getElementsByTagName('a');
            for (let i = 0; i < links.length; i++) {
                links[i].target = '_blank';
            }
            
            const images = iframe.contentWindow.document.getElementsByTagName('img');
            for (let i = 0; i < images.length; i++) {
                const src = images[i].getAttribute('src');
                if (src && !src.startsWith('http')) {
                    images[i].src = '${serverUrl}' + src;
                }
            }
        };
    })()`;
  }
}
