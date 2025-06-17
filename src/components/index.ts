/**
 * Index des composants principaux du Knowledge Hub
 * 
 * Ce fichier centralise les exports des composants les plus importants
 * pour faciliter les imports dans l'application.
 */

// Composants de chat
export { default as ChatInterface } from './chat/ChatInterface';
export { MessageComponent, MarkdownContent, ChatInput, MessagesDisplay } from './chat/components';

// Composants de dashboard
export { Dashboard } from './dashboard/Dashboard';
export { WidgetContainer } from './dashboard/WidgetContainer';

// Composants de statut
export { SystemStatus } from './status/SystemStatus';

// Composants de démonstration (widgets)
export { AlertDemo } from './demo/AlertDemo';
export { DataTable } from './demo/DataTable';
export { ProgressDemo } from './demo/ProgressDemo';
export { AccordionDemo } from './demo/AccordionDemo';
export { TabsDemo } from './demo/TabsDemo';

// Composants de graphiques
export { ClientLineChart } from './charts/ClientLineChart';
