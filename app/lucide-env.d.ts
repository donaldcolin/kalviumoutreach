import 'lucide-react-native';
import { ViewStyle, StyleProp } from 'react-native';

declare module 'lucide-react-native' {
  export interface LucideProps {
    color?: string;
    size?: number | string;
    strokeWidth?: number | string;
    fill?: string;
    className?: string;
    style?: StyleProp<ViewStyle>;
  }
}
