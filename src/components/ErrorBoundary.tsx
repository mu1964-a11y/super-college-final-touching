import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let firestoreInfo: any = null;

      try {
        if (this.state.error?.message) {
          firestoreInfo = JSON.parse(this.state.error.message);
          if (firestoreInfo && firestoreInfo.error) {
            errorMessage = `Database Error: ${firestoreInfo.error}`;
            if (firestoreInfo.error.includes('offline')) {
              errorMessage = "The system is currently offline. Please check your internet connection.";
            } else if (firestoreInfo.error.includes('insufficient permissions')) {
              errorMessage = "You do not have permission to perform this action.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, use default
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </Button>
              <Button 
                variant="outline" 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full"
              >
                Try to Recover
              </Button>
            </div>
            
            {firestoreInfo && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-mono break-all">
                  Op: {firestoreInfo.operationType} | Path: {firestoreInfo.path}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
