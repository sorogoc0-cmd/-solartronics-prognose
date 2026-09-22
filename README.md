# Solartronics Produktionsprognose

Interne Produktionsplanung für H07V-K-Kabel. Die Anwendung importiert Amazon-Bestellberichte, berücksichtigt ausschließlich H07V-K-SKUs und erstellt daraus Produktions- und Zuschnittlisten.

## Version autonome

`Solartronics-Bedarfsprognose.html` contient l'application complète (JavaScript et CSS inclus). Le fichier peut être ouvert directement dans Chrome ou Safari ; l'import et le traitement du CSV restent entièrement locaux.

Pour régénérer ce fichier après une modification :

```bash
npm run build:standalone
```

## Lokal starten

```bash
npm install
npm run dev
```
