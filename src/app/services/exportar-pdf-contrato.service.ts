import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { PlantillasService, PlantillaContrato } from './plantillas.service';

export interface DatosContratoPDF {
  contrato: any;
  estudiante: any;
  acudientes: any[];
  configuracion: any;
}

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfContratoService {
  private plantillaCache: PlantillaContrato | null = null;

  constructor(
    private plantillasService: PlantillasService,
    private institucionConfigService: InstitucionConfigService
  ) {}

  async generarPDF(datos: DatosContratoPDF): Promise<void> {
    try {
      const plantilla = await this.cargarPlantilla();
      const plantillaProcesada = this.reemplazarVariables(plantilla, datos);
      await this.generarPDFDesdePlantilla(plantillaProcesada, datos);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }

  private async cargarPlantilla(): Promise<PlantillaContrato> {
    if (this.plantillaCache) {
      return this.plantillaCache!;
    }

    try {
      const response: any = await firstValueFrom(
        this.plantillasService.obtenerByTipoClave(
          'contrato_matricula',
          'contrato_completo'
        )
      );
      console.log('cargarPlantilla', response);
      if (response && response.body && response.body.contenido) {
        this.plantillaCache = response.body.contenido;
        console.log('cargarPlantilla', this.plantillaCache);
        return this.plantillaCache!;
      }

      throw new Error('No se pudo cargar la plantilla del contrato');
    } catch (error) {
      console.error('Error al cargar plantilla:', error);
      throw error;
    }
  }

  private reemplazarVariables(
    plantilla: PlantillaContrato,
    datos: DatosContratoPDF
  ): PlantillaContrato {
    const config = datos.configuracion;
    const contrato = datos.contrato;
    const estudiante = datos.estudiante;
    const acudientes = datos.acudientes;

    const acudientesNombres = acudientes
      .map((a) => a.nombre_completo)
      .join(' y ');
    const acudientesDomicilio = acudientes[0]?.ciudad || this.institucionConfigService.getDireccionInstitucion();

    let textoPrimeraCuota = '';
    let numeroCuotasRestantes = contrato.numero_cuotas;
    if (contrato.valor_primera_cuota && contrato.valor_primera_cuota > 0) {
      textoPrimeraCuota = `, 1 cuota de ${this.formatearMoneda(
        contrato.valor_primera_cuota
      )}`;
      numeroCuotasRestantes = contrato.numero_cuotas - 1;
    }

    const reemplazos: { [key: string]: string } = {
      '{{representante_legal_nombre}}':
        config.representante_legal_nombre || 'Por definir',
      '{{representante_legal_cedula}}':
        config.representante_legal_cedula || '1.049.603.928',
      '{{representante_legal_cedula_lugar}}':
        config.representante_legal_cedula_lugar || 'Por definir',
      '{{institucion_nombre}}': config.institucion_nombre || this.institucionConfigService.getNombreInstitucion(),
      '{{institucion_nit}}': config.institucion_nit || this.institucionConfigService.getNitInstitucion(),
      '{{acudientes_nombres}}': acudientesNombres,
      '{{acudientes_domicilio}}': acudientesDomicilio,
      '{{estudiante_nombre}}': estudiante.nombre_completo,
      '{{estudiante_documento}}': estudiante.numero_identificacion,
      '{{nombre_grupo}}': estudiante.nombre_grupo || contrato.nombre_grupo,
      '{{valor_total_formateado}}': this.formatearMoneda(contrato.valor_total),
      '{{valor_matricula_formateado}}': this.formatearMoneda(
        contrato.valor_matricula
      ),
      '{{valor_pension_formateado}}': this.formatearMoneda(
        contrato.valor_pension
      ),
      '{{texto_primera_cuota}}': textoPrimeraCuota,
      '{{numero_cuotas_restantes}}': numeroCuotasRestantes.toString(),
      '{{mes_inicio}}': this.obtenerMesInicio(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{fecha_inicio}}': this.formatearFechaTexto(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{fecha_inicio_larga}}': this.formatearFechaLarga(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{anio}}': contrato.anio.toString(),
      '{{fecha_fin}}': this.formatearFechaTexto(contrato.fecha_fin),
      '{{lugar_firma}}': contrato.lugar_firma,
      '{{fecha_firma_larga}}': this.formatearFechaLarga(contrato.fecha_firma),
      '{{texto_autorizacion_imagenes}}':
        contrato.autoriza_imagenes === 1 ? 'SÍ' : 'NO',
      '{{numero_contrato}}': this.generarNumeroContrato(
        contrato.id,
        contrato.anio,
        'C'
      ),
      '{{numero_pagare}}': this.generarNumeroContrato(
        contrato.id,
        contrato.anio,
        'P'
      ),
    };

    const plantillaProcesada: PlantillaContrato = JSON.parse(
      JSON.stringify(plantilla)
    );

    plantillaProcesada.titulo = this.aplicarReemplazos(
      plantilla.titulo,
      reemplazos
    );
    plantillaProcesada.introduccion = this.aplicarReemplazos(
      plantilla.introduccion,
      reemplazos
    );
    (plantillaProcesada as any).introduccion_singular = (plantilla as any)
      .introduccion_singular
      ? this.aplicarReemplazos(
          (plantilla as any).introduccion_singular,
          reemplazos
        )
      : undefined;
    plantillaProcesada.pie_firma = this.aplicarReemplazos(
      plantilla.pie_firma,
      reemplazos
    );

    plantillaProcesada.clausulas = plantilla.clausulas.map((clausula: any) => ({
      numero: clausula.numero,
      titulo: this.aplicarReemplazos(clausula.titulo, reemplazos),
      titulo_singular: clausula.titulo_singular
        ? this.aplicarReemplazos(clausula.titulo_singular, reemplazos)
        : undefined,
      contenido: this.aplicarReemplazos(clausula.contenido, reemplazos),
      contenido_singular: clausula.contenido_singular
        ? this.aplicarReemplazos(clausula.contenido_singular, reemplazos)
        : undefined,
    }));

    if (plantilla.autorizacion_imagenes) {
      plantillaProcesada.autorizacion_imagenes = {
        titulo: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.titulo,
          reemplazos
        ),
        contenido: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.contenido,
          reemplazos
        ),
        pie_firma: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.pie_firma,
          reemplazos
        ),
      };
    }

    if (plantilla.pagare) {
      plantillaProcesada.pagare = {
        titulo: this.aplicarReemplazos(plantilla.pagare.titulo, reemplazos),
        numero: this.aplicarReemplazos(plantilla.pagare.numero, reemplazos),
        debo_pagare: this.aplicarReemplazos(
          plantilla.pagare.debo_pagare,
          reemplazos
        ),
        promesa: this.aplicarReemplazos(plantilla.pagare.promesa, reemplazos),
        beneficiario: {
          nombre: this.aplicarReemplazos(
            plantilla.pagare.beneficiario.nombre,
            reemplazos
          ),
          nit: this.aplicarReemplazos(
            plantilla.pagare.beneficiario.nit,
            reemplazos
          ),
        },
        lugar_pago: this.aplicarReemplazos(
          plantilla.pagare.lugar_pago,
          reemplazos
        ),
        valor: {
          numerico: this.aplicarReemplazos(
            plantilla.pagare.valor.numerico,
            reemplazos
          ),
          letras: this.aplicarReemplazos(
            plantilla.pagare.valor.letras,
            reemplazos
          ),
          complemento: this.aplicarReemplazos(
            plantilla.pagare.valor.complemento,
            reemplazos
          ),
        },
        intereses: this.aplicarReemplazos(
          plantilla.pagare.intereses,
          reemplazos
        ),
        valor_recibido: this.aplicarReemplazos(
          plantilla.pagare.valor_recibido,
          reemplazos
        ),
        vencimiento: this.aplicarReemplazos(
          plantilla.pagare.vencimiento,
          reemplazos
        ),
        nota_carta: this.aplicarReemplazos(
          plantilla.pagare.nota_carta,
          reemplazos
        ),
        pie_firma: this.aplicarReemplazos(
          plantilla.pagare.pie_firma,
          reemplazos
        ),
      };
    }

    if (plantilla.carta_instrucciones) {
      plantillaProcesada.carta_instrucciones = {
        titulo: this.aplicarReemplazos(
          plantilla.carta_instrucciones.titulo,
          reemplazos
        ),
        numero_pagare: this.aplicarReemplazos(
          plantilla.carta_instrucciones.numero_pagare,
          reemplazos
        ),
        fecha: this.aplicarReemplazos(
          plantilla.carta_instrucciones.fecha,
          reemplazos
        ),
        destinatario: this.aplicarReemplazos(
          plantilla.carta_instrucciones.destinatario,
          reemplazos
        ),
        contenido: this.aplicarReemplazos(
          plantilla.carta_instrucciones.contenido,
          reemplazos
        ),
        autorizacion_diligenciamiento: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_diligenciamiento.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_diligenciamiento
              .contenido,
            reemplazos
          ),
        },
        clausula_aceleratoria: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.clausula_aceleratoria.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.clausula_aceleratoria.contenido,
            reemplazos
          ),
        },
        regimen_legal: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.regimen_legal.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.regimen_legal.contenido,
            reemplazos
          ),
        },
        autorizacion_cobro: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_cobro.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_cobro.contenido,
            reemplazos
          ),
        },
        pie_firma: this.aplicarReemplazos(
          plantilla.carta_instrucciones.pie_firma,
          reemplazos
        ),
      };
    }

    return plantillaProcesada;
  }

  private aplicarReemplazos(
    texto: string,
    reemplazos: { [key: string]: string }
  ): string {
    let resultado = texto;
    Object.keys(reemplazos).forEach((variable) => {
      resultado = resultado.replace(
        new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        reemplazos[variable]
      );
    });
    return resultado;
  }

  private async generarPDFDesdePlantilla(
    plantilla: PlantillaContrato,
    datos: DatosContratoPDF
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 15;

    const primaryColor = '#222';
    const goldColor = '#d4af37';
    const grayColor = '#666';

    const logoBase64 = await this.cargarLogoBase64();
    const firmaBase64 = await this.cargarFirmaBase64();

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );
    yPos = this.dibujarTitulo(doc, plantilla.titulo, yPos, pageWidth);
    // Seleccionar versión singular o plural según número de acudientes
    const numAcudientes = datos.acudientes.length;
    const introduccionFinal =
      numAcudientes === 1 && (plantilla as any).introduccion_singular
        ? (plantilla as any).introduccion_singular
        : plantilla.introduccion;

    yPos = this.dibujarTexto(
      doc,
      introduccionFinal,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    for (let i = 0; i < plantilla.clausulas.length; i++) {
      const clausula = plantilla.clausulas[i];

      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = this.dibujarEncabezado(
          doc,
          logoBase64,
          15,
          pageWidth,
          goldColor,
          datos.configuracion
        );
      }

      // Seleccionar versión singular o plural
      const clausulaFinal = {
        numero: clausula.numero,
        titulo:
          numAcudientes === 1 && (clausula as any).titulo_singular
            ? (clausula as any).titulo_singular
            : clausula.titulo,
        contenido:
          numAcudientes === 1 && (clausula as any).contenido_singular
            ? (clausula as any).contenido_singular
            : clausula.contenido,
      };

      yPos = this.dibujarClausula(
        doc,
        clausulaFinal,
        yPos,
        marginLeft,
        contentWidth,
        pageHeight,
        logoBase64,
        goldColor,
        datos.configuracion
      );
    }

    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        pageWidth,
        goldColor,
        datos.configuracion
      );
    }

    yPos = this.dibujarTexto(
      doc,
      plantilla.pie_firma,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );
    yPos += 5;

    yPos = await this.dibujarFirmas(
      doc,
      datos,
      firmaBase64,
      yPos,
      pageWidth,
      marginLeft
    );

    if (
      datos.contrato.autoriza_imagenes === 1 &&
      plantilla.autorizacion_imagenes
    ) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        pageWidth,
        goldColor,
        datos.configuracion
      );
      yPos = await this.dibujarAutorizacionImagenes(
        doc,
        plantilla.autorizacion_imagenes,
        datos,
        firmaBase64,
        yPos,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor
      );
    }

    // Solo generar pagaré y carta si autoriza_pagare es 1
    const autorizaPagare =
      datos.contrato.autoriza_pagare === 1 ||
      datos.contrato.autoriza_pagare === '1';

    if (autorizaPagare && plantilla.carta_instrucciones) {
      yPos = await this.dibujarCartaInstrucciones(
        doc,
        plantilla.carta_instrucciones,
        datos,
        logoBase64,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor,
        goldColor
      );
    }

    if (autorizaPagare && plantilla.pagare) {
      yPos = await this.dibujarPagareEjecutivo(
        doc,
        plantilla.pagare,
        datos,
        logoBase64,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor,
        goldColor
      );
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.dibujarPiePagina(
        doc,
        i,
        totalPages,
        pageWidth,
        pageHeight,
        grayColor,
        datos.configuracion
      );
    }

    const nombreArchivo = `Contrato_${datos.estudiante.nombre_completo?.replace(
      /\s+/g,
      '_'
    )}_${datos.contrato.anio}.pdf`;
    doc.save(nombreArchivo);
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar logo:', error);
      return '';
    }
  }
  private async cargarFirmaBase64(): Promise<string> {
    try {
      const response = await fetch('assets/images/firma_representante.png');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar firma:', error);
      return '';
    }
  }

  private dibujarEncabezado(
    doc: jsPDF,
    logoBase64: string,
    yPos: number,
    pageWidth: number,
    goldColor: string,
    config: any
  ): number {
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 20, yPos, 25, 25);
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(
      config.institucion_nombre || this.institucionConfigService.getNombreInstitucion(),
      pageWidth / 2,
      yPos + 10,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666');
    doc.text(
      `NIT ${config.institucion_nit || this.institucionConfigService.getNitInstitucion()}`,
      pageWidth / 2,
      yPos + 16,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.text(
      config.institucion_eslogan || 'ILUMINANDO MENTES - FORJANDO LÍDERES',
      pageWidth / 2,
      yPos + 21,
      { align: 'center' }
    );

    doc.setDrawColor(goldColor);
    doc.setLineWidth(1);
    doc.line(20, yPos + 28, pageWidth - 20, yPos + 28);

    return yPos + 35;
  }

  private dibujarTitulo(
    doc: jsPDF,
    titulo: string,
    yPos: number,
    pageWidth: number
  ): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(titulo, pageWidth / 2, yPos, { align: 'center' });
    return yPos + 12;
  }

  private dibujarTexto(
    doc: jsPDF,
    texto: string,
    yPos: number,
    marginLeft: number,
    contentWidth: number,
    color: string
  ): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#222');

    const lines = doc.splitTextToSize(texto, contentWidth);
    doc.text(lines, marginLeft, yPos);

    return yPos + lines.length * 5 + 6;
  }

  private dibujarClausula(
    doc: jsPDF,
    clausula: any,
    yPos: number,
    marginLeft: number,
    contentWidth: number,
    pageHeight: number,
    logoBase64: string,
    goldColor: string,
    config: any
  ): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#222');

    const tituloCompleto = `CLAUSULA ${this.numeroATexto(
      clausula.numero
    ).toUpperCase()}. ${clausula.titulo}:`;
    const linesTitulo = doc.splitTextToSize(tituloCompleto, contentWidth);
    doc.text(linesTitulo, marginLeft, yPos);
    yPos += linesTitulo.length * 5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#222');

    const contenidoLimpio = clausula.contenido.replace(/●/g, '-');
    const parrafos = contenidoLimpio.split('\n\n');

    parrafos.forEach((parrafo: string) => {
      const parrafoLimpio = parrafo.trim();
      if (!parrafoLimpio) return;

      const linesContenido = doc.splitTextToSize(parrafoLimpio, contentWidth);

      const espacioNecesario = linesContenido.length * 4.2 + 2;
      if (yPos + espacioNecesario > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
        yPos = this.dibujarEncabezado(
          doc,
          logoBase64,
          yPos,
          doc.internal.pageSize.getWidth(),
          goldColor,
          config
        );
        doc.setTextColor('#222');
        doc.setFontSize(10);
      }

      doc.text(linesContenido, marginLeft, yPos);
      yPos += espacioNecesario;
    });

    return yPos + 3;
  }

  private async dibujarFirmas(
    doc: jsPDF,
    datos: DatosContratoPDF,
    firmaBase64: string,
    yPos: number,
    pageWidth: number,
    marginLeft: number
  ): Promise<number> {
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;

    // SIN verificación de espacio - siempre dibuja en la misma página
    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    // Firmas de acudientes - ESPACIADO COMPACTO
    datos.acudientes.slice(0, 2).forEach((acudiente, index) => {
      const x = xPos + index * (firmaWidth + espacioEntreFirmas);

      doc.setDrawColor('#666');
      doc.setLineWidth(0.5);
      doc.line(x, yPos + 12, x + firmaWidth, yPos + 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#222');
      doc.text(acudiente.nombre_completo || '', x + firmaWidth / 2, yPos + 17, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `CC. ${acudiente.numero_identificacion}`,
        x + firmaWidth / 2,
        yPos + 21,
        { align: 'center' }
      );

      doc.setTextColor('#666');
      doc.setFontSize(7);
      doc.text(
        acudiente.tipo_acudiente || 'ACUDIENTE',
        x + firmaWidth / 2,
        yPos + 24,
        { align: 'center' }
      );
      doc.setTextColor('#222');
    });

    yPos += 28;

    // Segunda fila de acudientes si hay más de 2
    if (numFirmas > 2) {
      xPos = (pageWidth - totalWidth) / 2;
      datos.acudientes.slice(2, 4).forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);

        doc.setDrawColor('#666');
        doc.setLineWidth(0.5);
        doc.line(x, yPos + 12, x + firmaWidth, yPos + 12);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#222');
        doc.text(
          acudiente.nombre_completo || '',
          x + firmaWidth / 2,
          yPos + 17,
          { align: 'center' }
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(
          `CC. ${acudiente.numero_identificacion}`,
          x + firmaWidth / 2,
          yPos + 21,
          { align: 'center' }
        );

        doc.setTextColor('#666');
        doc.setFontSize(7);
        doc.text(
          acudiente.tipo_acudiente || 'ACUDIENTE',
          x + firmaWidth / 2,
          yPos + 24,
          { align: 'center' }
        );
        doc.setTextColor('#222');
      });
      yPos += 28;
    }

    // Firma del representante legal
    const xRepresentante = (pageWidth - firmaWidth) / 2;

    if (firmaBase64) {
      try {
        doc.addImage(firmaBase64, 'PNG', xRepresentante + 10, yPos - 2, 50, 14);
      } catch (error) {
        console.warn('No se pudo insertar la firma:', error);
      }
    }

    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(xRepresentante, yPos + 12, xRepresentante + firmaWidth, yPos + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(
      datos.configuracion.representante_legal_nombre || '',
      xRepresentante + firmaWidth / 2,
      yPos + 17,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `CC. ${datos.configuracion.representante_legal_cedula || ''}`,
      xRepresentante + firmaWidth / 2,
      yPos + 21,
      { align: 'center' }
    );

    doc.setTextColor('#666');
    doc.setFontSize(7);
    doc.text(
      'REPRESENTANTE LEGAL',
      xRepresentante + firmaWidth / 2,
      yPos + 24,
      { align: 'center' }
    );
    doc.setTextColor('#222');

    return yPos + 28;
  }

  private async dibujarAutorizacionImagenes(
    doc: jsPDF,
    autorizacion: any,
    datos: DatosContratoPDF,
    firmaBase64: string,
    yPos: number,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string
  ): Promise<number> {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    const tituloLines = doc.splitTextToSize(autorizacion.titulo, contentWidth);
    doc.text(tituloLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += tituloLines.length * 6 + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = this.dibujarTexto(
      doc,
      autorizacion.contenido,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    yPos += 10;
    yPos = this.dibujarTexto(
      doc,
      autorizacion.pie_firma,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    yPos += 10;

    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    datos.acudientes.slice(0, 2).forEach((acudiente, index) => {
      const x = xPos + index * (firmaWidth + espacioEntreFirmas);

      doc.setDrawColor('#666');
      doc.setLineWidth(0.5);
      doc.line(x, yPos + 15, x + firmaWidth, yPos + 15);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#222');
      doc.text(acudiente.nombre_completo || '', x + firmaWidth / 2, yPos + 20, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `CC. ${acudiente.numero_identificacion}`,
        x + firmaWidth / 2,
        yPos + 24,
        { align: 'center' }
      );

      doc.setTextColor('#666');
      doc.setFontSize(7);
      doc.text(
        acudiente.tipo_acudiente || 'ACUDIENTE',
        x + firmaWidth / 2,
        yPos + 28,
        { align: 'center' }
      );
      doc.setTextColor('#222');
    });

    return yPos + 35;
  }

  private dibujarPiePagina(
    doc: jsPDF,
    numeroPagina: number,
    totalPaginas: number,
    pageWidth: number,
    pageHeight: number,
    grayColor: string,
    config: any
  ): void {
    const yPos = pageHeight - 15;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);

    doc.text(`Página ${numeroPagina} de ${totalPaginas}`, pageWidth / 2, yPos, {
      align: 'center',
    });

    const textoContacto = `${config.institucion_telefono || ''} | ${
      config.institucion_email || ''
    } | ${config.institucion_web || ''}`;
    doc.text(textoContacto, pageWidth / 2, yPos + 4, { align: 'center' });

    doc.text(config.institucion_direccion || '', pageWidth / 2, yPos + 8, {
      align: 'center',
    });
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(valor)
      .replace('COP', '')
      .trim();
  }

  private formatearFechaLarga(fechaStr: string): string {
    const [fecha] = fechaStr.split('T');
    const [anio, mes, dia] = fecha.split('-');

    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    return `${parseInt(dia)} del mes de ${
      meses[parseInt(mes) - 1]
    } del año ${anio}`;
  }

  private formatearFechaTexto(fechaStr: string | null | undefined): string {
    if (!fechaStr) {
      const ahora = new Date();
      const anioSiguiente = ahora.getFullYear() + 1;
      return `30 de noviembre del año ${anioSiguiente}`;
    }

    try {
      const [fecha] = fechaStr.split('T');
      const [anio, mes, dia] = fecha.split('-');

      const diaNum = parseInt(dia);
      const mesNum = parseInt(mes);
      const anioNum = parseInt(anio);

      if (isNaN(diaNum) || isNaN(mesNum) || isNaN(anioNum)) {
        throw new Error('Fecha inválida');
      }

      return `${dia} de ${this.obtenerNombreMes(mesNum)} del año ${anio}`;
    } catch (error) {
      console.warn('Error formateando fecha:', fechaStr, error);
      const ahora = new Date();
      const anioSiguiente = ahora.getFullYear() + 1;
      return `30 de noviembre del año ${anioSiguiente}`;
    }
  }

  private obtenerMesInicio(fechaStr: string): string {
    if (!fechaStr) return 'enero';
    const [fecha] = fechaStr.split('T');
    const [, mes] = fecha.split('-');
    return this.obtenerNombreMes(parseInt(mes));
  }

  private obtenerNombreMes(mes: number): string {
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return meses[mes - 1] || 'enero';
  }

  private numeroATexto(num: number): string {
    const textos = [
      '',
      'primera',
      'segunda',
      'tercera',
      'cuarta',
      'quinta',
      'sexta',
      'séptima',
      'octava',
      'novena',
      'décima',
      'décima primera',
      'décima segunda',
      'décima tercera',
      'décima cuarta',
    ];
    return textos[num] || num.toString();
  }

  private generarNumeroContrato(
    idContrato: number,
    anio: number,
    prefijo: string = 'C'
  ): string {
    const añoCorto = anio.toString().slice(-2);
    const idFormateado = idContrato.toString().padStart(5, '0');
    return `${prefijo}LL${añoCorto}-${idFormateado}`;
  }

  private dibujarFirmaPagare(
    doc: jsPDF,
    acudiente: any,
    xPos: number,
    yPos: number,
    firmaWidth: number
  ): void {
    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(xPos, yPos + 15, xPos + firmaWidth, yPos + 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(
      acudiente.nombre_completo || '',
      xPos + firmaWidth / 2,
      yPos + 20,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `CC. ${acudiente.numero_identificacion}`,
      xPos + firmaWidth / 2,
      yPos + 24,
      { align: 'center' }
    );

    doc.setTextColor('#666');
    doc.setFontSize(7);
    doc.text('DEUDOR SOLIDARIO', xPos + firmaWidth / 2, yPos + 28, {
      align: 'center',
    });
    doc.setTextColor('#222');
  }

  private async dibujarCartaInstrucciones(
    doc: jsPDF,
    cartaInstrucciones: any,
    datos: DatosContratoPDF,
    logoBase64: string,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    goldColor: string
  ): Promise<number> {
    doc.addPage();
    let yPos = 15;

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(cartaInstrucciones.titulo, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(cartaInstrucciones.numero_pagare, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 12;

    doc.setFontSize(10);
    doc.text(cartaInstrucciones.fecha, pageWidth - marginLeft, yPos, {
      align: 'right',
    });
    yPos += 12;

    const destinatarioLines = doc.splitTextToSize(
      cartaInstrucciones.destinatario,
      contentWidth
    );
    doc.text(destinatarioLines, marginLeft, yPos);
    yPos += destinatarioLines.length * 5 + 8;

    const contenidoLines = doc.splitTextToSize(
      cartaInstrucciones.contenido,
      contentWidth
    );
    doc.text(contenidoLines, marginLeft, yPos);
    yPos += contenidoLines.length * 5 + 7;

    doc.setFont('helvetica', 'bold');
    doc.text(
      cartaInstrucciones.autorizacion_diligenciamiento.titulo,
      marginLeft,
      yPos
    );
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const autDiligLines = doc.splitTextToSize(
      cartaInstrucciones.autorizacion_diligenciamiento.contenido,
      contentWidth
    );
    doc.text(autDiligLines, marginLeft, yPos);
    yPos += autDiligLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.clausula_aceleratoria.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const clausulaLines = doc.splitTextToSize(
      cartaInstrucciones.clausula_aceleratoria.contenido,
      contentWidth
    );
    doc.text(clausulaLines, marginLeft, yPos);
    yPos += clausulaLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.regimen_legal.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const regimenLines = doc.splitTextToSize(
      cartaInstrucciones.regimen_legal.contenido,
      contentWidth
    );
    doc.text(regimenLines, marginLeft, yPos);
    yPos += regimenLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.autorizacion_cobro.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const autCobroLines = doc.splitTextToSize(
      cartaInstrucciones.autorizacion_cobro.contenido,
      contentWidth
    );
    doc.text(autCobroLines, marginLeft, yPos);
    yPos += autCobroLines.length * 4.5 + 7;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.pie_firma, marginLeft, yPos);
    yPos += 10;

    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;

    if (numFirmas === 1) {
      const xPos = (pageWidth - firmaWidth) / 2;
      this.dibujarFirmaPagare(doc, datos.acudientes[0], xPos, yPos, firmaWidth);
    } else if (numFirmas === 2) {
      const totalWidth = firmaWidth * 2 + espacioEntreFirmas;
      let xPos = (pageWidth - totalWidth) / 2;

      datos.acudientes.forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        this.dibujarFirmaPagare(doc, acudiente, x, yPos, firmaWidth);
      });
    } else {
      const firmasPorFila = 2;
      const totalWidth = firmaWidth * firmasPorFila + espacioEntreFirmas;
      let xPos = (pageWidth - totalWidth) / 2;

      datos.acudientes.forEach((acudiente, index) => {
        const fila = Math.floor(index / firmasPorFila);
        const columna = index % firmasPorFila;
        const x = xPos + columna * (firmaWidth + espacioEntreFirmas);
        const y = yPos + fila * 30;

        this.dibujarFirmaPagare(doc, acudiente, x, y, firmaWidth);
      });
    }

    return yPos;
  }

  private async dibujarPagareEjecutivo(
    doc: jsPDF,
    pagare: any,
    datos: DatosContratoPDF,
    logoBase64: string,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    goldColor: string
  ): Promise<number> {
    doc.addPage();
    let yPos = 15;

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(pagare.titulo, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.numero, pageWidth / 2, yPos, { align: 'center' });
    yPos += 14;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.debo_pagare, marginLeft, yPos);
    yPos += 9;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.promesa, marginLeft, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.beneficiario.nombre, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.beneficiario.nit, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    const lugarPagoLines = doc.splitTextToSize(pagare.lugar_pago, contentWidth);
    doc.text(lugarPagoLines, marginLeft, yPos);
    yPos += lugarPagoLines.length * 5 + 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.valor.numerico, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.valor.letras, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(pagare.valor.complemento, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 10;

    doc.text(pagare.intereses, marginLeft, yPos);
    yPos += 7;

    doc.text(pagare.valor_recibido, marginLeft, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(pagare.vencimiento, marginLeft, yPos);
    yPos += 16;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const notaLines = doc.splitTextToSize(pagare.nota_carta, contentWidth);
    doc.text(notaLines, marginLeft, yPos);
    yPos += notaLines.length * 4 + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.pie_firma, marginLeft, yPos);
    yPos += 10;

    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;

    if (numFirmas === 1) {
      const xPos = (pageWidth - firmaWidth) / 2;
      this.dibujarFirmaPagare(doc, datos.acudientes[0], xPos, yPos, firmaWidth);
    } else if (numFirmas === 2) {
      const totalWidth = firmaWidth * 2 + espacioEntreFirmas;
      let xPos = (pageWidth - totalWidth) / 2;

      datos.acudientes.forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        this.dibujarFirmaPagare(doc, acudiente, x, yPos, firmaWidth);
      });
    } else {
      const firmasPorFila = 2;
      const totalWidth = firmaWidth * firmasPorFila + espacioEntreFirmas;
      let xPos = (pageWidth - totalWidth) / 2;

      datos.acudientes.forEach((acudiente, index) => {
        const fila = Math.floor(index / firmasPorFila);
        const columna = index % firmasPorFila;
        const x = xPos + columna * (firmaWidth + espacioEntreFirmas);
        const y = yPos + fila * 30;

        this.dibujarFirmaPagare(doc, acudiente, x, y, firmaWidth);
      });
    }

    return yPos;
  }
}