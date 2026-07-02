import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/api_ia/gemini.service';
import { LanguageToolService } from '../../services/api_ia/language-tool.service';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mejorar-texto',
  templateUrl: './mejorar-texto.component.html',
  styleUrls: ['./mejorar-texto.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MejorarTextoComponent {
  @Input() texto: string = '';
  @Input() contexto: string = ''; // Nuevo input para recibir contexto
  @Output() textoMejorado = new EventEmitter<string>();
  
  procesando: boolean = false;
  servicioActual: string = 'LanguageTool';

  constructor(
    private geminiService: GeminiService,
    private languageToolService: LanguageToolService
  ) {}

  mejorarTexto() {
    if (!this.texto || this.texto.trim() === '') {
      return;
    }

    this.procesando = true;
    this.servicioActual = 'LanguageTool';
    
    // Paso 1: Primero intentamos con LanguageTool para corrección ortográfica
    this.languageToolService.mejorarRedaccion(this.texto)
      .pipe(
        // Si falla LanguageTool, intentamos con Gemini
        catchError((error: any) => {
          console.warn('LanguageTool falló, usando Gemini como respaldo:', error);
          this.servicioActual = 'Gemini';
          this.mostrarNotificacionCambioServicio('Gemini');
          return this.geminiService.mejorarRedaccion(this.texto); // Pasar contexto a Gemini
        }),
        // Después de procesar con LanguageTool, siempre intentamos con Gemini
        switchMap((resultado: any) => {
          if (this.servicioActual === 'LanguageTool') {
            // Procesamos el resultado de LanguageTool
            const textoCorregido = this.languageToolService.procesarYMejorarTexto(this.texto, resultado);
            console.log('Texto corregido por LanguageTool:', textoCorregido);
            
            // Siempre intentamos con Gemini después de LanguageTool
            console.log('Intentando mejorar aún más con Gemini');
            this.servicioActual = 'Gemini';
            this.mostrarNotificacionCambioServicio('Gemini');
            
            // Guardamos el resultado de LanguageTool por si acaso falla Gemini
            const languageToolResult = textoCorregido;
            let texto_con_contexto = "contexto: " + this.contexto + " texto: "+ textoCorregido
            // Intentamos con Gemini y manejamos posibles errores
            console.log ("texto_con_contexto", texto_con_contexto)
            return this.geminiService.mejorarRedaccion(texto_con_contexto) // Usar texto corregido y contexto
              .pipe(
                catchError((geminiError: any) => {
                  console.error('Error con Gemini después de LanguageTool:', geminiError);
                  // Si Gemini falla, volvemos al resultado de LanguageTool
                  return of({ useLanguageTool: true, text: languageToolResult });
                })
              );
          }
          
          // Si ya estamos usando Gemini (porque LanguageTool falló), devolvemos el resultado directamente
          return of({ useLanguageTool: false, result: resultado });
        })
      )
      .subscribe({
        next: (finalResult: any) => {
          let textoMejorado: string = this.texto; // Valor por defecto: texto original
          
          try {
            console.log('Resultado final completo:', finalResult);
            
            if (finalResult && finalResult.useLanguageTool === true) {
              // Usamos el resultado de LanguageTool
              textoMejorado = finalResult.text || this.texto;
              console.log('Usando resultado de LanguageTool:', textoMejorado);
            } else {
              // Este es el resultado directo de Gemini o el resultado que pasó por switchMap
              // Primero verificamos si es la estructura esperada con el campo 'result'
              if (finalResult && finalResult.result) {
                const geminiResult = finalResult.result;
                console.log('Estructura con campo result:', geminiResult);
                // Intentamos extraer texto usando la estructura esperada
                const textoExtraido = this.extractGeminiText(geminiResult);
                if (textoExtraido !== undefined) {
                  textoMejorado = textoExtraido;
                }
              } else {
                // Intentamos procesar directamente la respuesta de Gemini
                console.log('Intentando procesar directamente la respuesta de Gemini');
                const textoExtraido = this.extractGeminiText(finalResult);
                if (textoExtraido !== undefined) {
                  textoMejorado = textoExtraido;
                } else {
                  console.warn('No se pudo extraer texto de la respuesta:', finalResult);
                }
              }
            }
          } catch (error) {
            console.error('Error al procesar el resultado:', error);
          }
          
          // Verificación final para asegurarnos de que tenemos algo para enviar
          if (!textoMejorado || textoMejorado.trim() === '') {
            textoMejorado = this.texto;
            console.warn('El servicio respondió con un texto vacío o inválido. Usando texto original.');
          }
          
          // Emitir el resultado final
          this.textoMejorado.emit(textoMejorado);
          this.procesando = false;
        },
        error: (error: any) => {
          console.error('Error en el proceso completo:', error);
          this.procesando = false;
          
          Swal.fire({
            title: 'Error',
            text: 'No se pudo mejorar el texto. Por favor, inténtelo de nuevo más tarde.',
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
          
          this.textoMejorado.emit(this.texto);
        }
      });
  }
  
  /**
   * Extrae el texto de la respuesta de Gemini intentando diferentes estructuras posibles
   * @param response La respuesta de Gemini
   * @returns El texto extraído o undefined si no se encuentra
   */
  private extractGeminiText(response: any): string | undefined {
    try {
      // Basado en la estructura que compartiste
      if (response && response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate && candidate.content && candidate.content.parts && 
            Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          const part = candidate.content.parts[0];
          if (part && typeof part.text === 'string') {
            return part.text;
          }
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error extrayendo texto de Gemini:', error);
      return undefined;
    }
  }
  
  // Método para mostrar una notificación de cambio de servicio
  private mostrarNotificacionCambioServicio(nuevoServicio: string) {
    Swal.fire({
      title: 'Cambiando servicio',
      text: `Usando ${nuevoServicio} para mejorar el texto`,
      icon: 'info',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }
}