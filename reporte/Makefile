.PHONY: pdf palabras figuras limpiar

pdf: figuras
	latexmk -pdf -interaction=nonstopmode -halt-on-error REPORTE_TECNICO.tex

figuras:
	MPLCONFIGDIR=/tmp/mpl-cebadata python3 scripts/figuras.py

palabras:
	texcount -inc -sum -utf8 REPORTE_TECNICO.tex

limpiar:
	latexmk -C
	rm -f *.bbl *.run.xml
