import './LoadingSpinner.css';

/**
 * LoadingSpinner 組件 - 顯示載入動畫
 *
 * 學習重點：
 * 1. 使用純 CSS 實現旋轉動畫，不依賴外部庫
 * 2. 組件設計：支援不同尺寸
 * 3. 無障礙設計：使用 aria-label 和 role 屬性
 */

interface LoadingSpinnerProps {
  /** Spinner 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 自定義 className */
  className?: string;
}

/**
 * LoadingSpinner 組件
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="large" />
 * ```
 */
export function LoadingSpinner({
  size = 'medium',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`loading-spinner-container ${className}`}
      role="status"
      aria-live="polite"
      aria-label="載入中"
    >
      {/* 旋轉的圓圈 Spinner */}
      <div
        className={`loading-spinner ${size}`}
        aria-hidden="true"
      />

      {/* 無障礙設計：為屏幕閱讀器提供文字 */}
      <span className="sr-only">載入中，請稍候...</span>
    </div>
  );
}

/**
 * ChartLoadingSpinner - 專門用於圖表載入的預設配置
 */
export function ChartLoadingSpinner() {
  return <LoadingSpinner size="large" />;
}

export default LoadingSpinner;
