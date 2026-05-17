type IconProps = {
  class?: string;
};

export const CheckIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path d="M2.5 15.5L9.20588 20.5L21.5 3.5" stroke="currentColor" stroke-linecap="round" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M15 20L9.12136 14.1213C7.94978 12.9498 7.94978 11.0503 9.12135 9.8787L15 4"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const XIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path d="M4.5 4.5L19.5 19.5M19.5 4.5L4.5 19.5" stroke="currentColor" stroke-linecap="round" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M9 4L14.8787 9.87866C16.0503 11.0502 16.0503 12.9497 14.8787 14.1213L9 20"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const AnthropicIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M17.0977 4H13.5611L19.8941 20H23.3484L17.0977 4ZM6.89916 4L0.648438 20H4.18503L5.58322 16.6359H12.1629L13.4789 19.9179H17.0155L10.6003 4H6.98141H6.89916ZM6.57018 13.6821L8.70858 8.02051L10.9292 13.6821H6.65242H6.57018Z"
      fill="currentColor"
    />
  </svg>
);

export const OpenAIIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M9.79648 9.34799V7.49548C9.79648 7.33946 9.85502 7.22239 9.99146 7.14447L13.7161 4.9995C14.2231 4.70702 14.8276 4.57058 15.4515 4.57058C17.7915 4.57058 19.2736 6.38413 19.2736 8.31455C19.2736 8.451 19.2736 8.60703 19.254 8.76305L15.393 6.501C15.159 6.36456 14.925 6.36456 14.691 6.501L9.79648 9.34799ZM18.4935 16.5631V12.1364C18.4935 11.8634 18.3764 11.6684 18.1425 11.5319L13.248 8.68494L14.847 7.76838C14.9834 7.69046 15.1005 7.69046 15.237 7.76838L18.9615 9.91336C20.0342 10.5374 20.7555 11.8634 20.7555 13.1503C20.7555 14.6322 19.8782 15.9973 18.4935 16.5628V16.5631ZM8.64599 12.663L7.04699 11.7271C6.91054 11.6492 6.85201 11.5321 6.85201 11.3761V7.08614C6.85201 4.99968 8.45101 3.42007 10.6156 3.42007C11.4346 3.42007 12.195 3.69316 12.8386 4.18061L8.99717 6.40369C8.76323 6.54015 8.64617 6.73513 8.64617 7.00822V12.6632L8.64599 12.663ZM12.0878 14.652L9.79648 13.3651V10.6351L12.0878 9.34818L14.3789 10.6351V13.3651L12.0878 14.652ZM13.56 20.5801C12.741 20.5801 11.9806 20.307 11.3369 19.8196L15.1784 17.5964C15.4123 17.46 15.5294 17.2651 15.5294 16.992V11.3369L17.148 12.2729C17.2845 12.3508 17.3429 12.4679 17.3429 12.6239V16.9139C17.3429 19.0003 15.7243 20.5801 13.56 20.5801ZM8.93846 16.2316L5.21387 14.0866C4.14128 13.4625 3.41989 12.1366 3.41989 10.8497C3.41989 9.34818 4.31688 8.00269 5.70131 7.43713V11.8831C5.70131 12.1562 5.81838 12.3512 6.05232 12.4876L10.9274 15.315L9.32842 16.2316C9.19196 16.3096 9.0749 16.3096 8.93846 16.2316ZM8.72408 19.4297C6.52057 19.4297 4.90201 17.772 4.90201 15.7246C4.90201 15.5685 4.92158 15.4125 4.94097 15.2565L8.78243 17.4796C9.01637 17.616 9.2505 17.616 9.48444 17.4796L14.3789 14.6522V16.5047C14.3789 16.6607 14.3204 16.7777 14.1839 16.8557L10.4593 19.0007C9.95233 19.2931 9.3478 19.4297 8.72391 19.4297H8.72408ZM13.56 21.75C15.9195 21.75 17.8889 20.073 18.3376 17.85C20.5215 17.2844 21.9256 15.2369 21.9256 13.1505C21.9256 11.7855 21.3406 10.4595 20.2876 9.50401C20.3851 9.09448 20.4437 8.68494 20.4437 8.27559C20.4437 5.48714 18.1816 3.4005 15.5686 3.4005C15.0422 3.4005 14.5351 3.47842 14.0281 3.65401C13.1505 2.79599 11.9415 2.25 10.6156 2.25C8.25602 2.25 6.28663 3.92691 5.83795 6.14999C3.65402 6.71555 2.25 8.76305 2.25 10.8495C2.25 12.2146 2.83494 13.5405 3.88796 14.496C3.79046 14.9055 3.73194 15.315 3.73194 15.7244C3.73194 18.5128 5.99397 20.5994 8.60703 20.5994C9.13344 20.5994 9.64047 20.5216 10.1475 20.346C11.0249 21.204 12.2339 21.75 13.56 21.75Z"
      fill="currentColor"
    />
  </svg>
);

export const ArrowUpIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" stroke-width={strokeWidth} viewBox="0 0 24 24" {...props}>
    <path d="M12 3.5V20.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5.5 10L12 3.5L18.5 10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const CodeIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" stroke-width={strokeWidth} viewBox="0 0 24 24" {...props}>
    <path d="M8.25 5.75L2 12L8.25 18.25" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15.75 5.75L22 12L15.75 18.25" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const StopIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M20.5 15.7V8.3C20.5 6.61984 20.5 5.77976 20.173 5.13803C19.8854 4.57354 19.4265 4.1146 18.862 3.82698C18.2202 3.5 17.3802 3.5 15.7 3.5H8.3C6.61984 3.5 5.77976 3.5 5.13803 3.82698C4.57354 4.1146 4.1146 4.57354 3.82698 5.13803C3.5 5.77976 3.5 6.61984 3.5 8.3V15.7C3.5 17.3802 3.5 18.2202 3.82698 18.862C4.1146 19.4265 4.57354 19.8854 5.13803 20.173C5.77976 20.5 6.61984 20.5 8.3 20.5H15.7C17.3802 20.5 18.2202 20.5 18.862 20.173C19.4265 19.8854 19.8854 19.4265 20.173 18.862C20.5 18.2202 20.5 17.3802 20.5 15.7Z"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M16.5 16.5C17.43 16.5 17.895 16.5 18.2765 16.3978C19.3117 16.1204 20.1204 15.3117 20.3978 14.2765C20.5 13.895 20.5 13.43 20.5 12.5V8.3C20.5 6.61984 20.5 5.77976 20.173 5.13803C19.8854 4.57354 19.4265 4.1146 18.862 3.82698C18.2202 3.5 17.3802 3.5 15.7 3.5H12C11.07 3.5 10.605 3.5 10.2235 3.60222C9.18827 3.87962 8.37962 4.68827 8.10222 5.72354C8 6.10504 8 6.57003 8 7.5M16.5 12.3V15.7C16.5 17.3802 16.5 18.2202 16.173 18.862C15.8854 19.4265 15.4265 19.8854 14.862 20.173C14.2202 20.5 13.3802 20.5 11.7 20.5H8.3C6.61984 20.5 5.77976 20.5 5.13803 20.173C4.57354 19.8854 4.1146 19.4265 3.82698 18.862C3.5 18.2202 3.5 17.3802 3.5 15.7V12.3C3.5 10.6198 3.5 9.77976 3.82698 9.13803C4.1146 8.57354 4.57354 8.1146 5.13803 7.82698C5.77976 7.5 6.61984 7.5 8.3 7.5H11.7C13.3802 7.5 14.2202 7.5 14.862 7.82698C15.4265 8.1146 15.8854 8.57354 16.173 9.13803C16.5 9.77976 16.5 10.6198 16.5 12.3Z"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const GearIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M19.2479 6.923L12.9979 3.32455C12.3802 2.96888 11.6198 2.96888 11.0021 3.32455L4.75208 6.92297C4.13211 7.27992 3.75 7.94083 3.75 8.65622V15.3439C3.75 16.0593 4.13213 16.7202 4.75213 17.0772L11.0021 20.6754C11.6198 21.031 12.3802 21.031 12.9979 20.6753L19.2479 17.0769C19.8679 16.7199 20.25 16.059 20.25 15.3436V8.65625C20.25 7.94086 19.8679 7.27995 19.2479 6.923Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
    />
    <path
      d="M15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C10.2051 15.25 8.75 13.7949 8.75 12C8.75 10.2051 10.2051 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
    />
  </svg>
);

export const HistoryIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M12 7.75V12L15.5 15.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M2.75 4.75V8.75H6.75"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M3.25 15.0833C4.52169 18.676 7.95303 21.25 11.9864 21.25C17.1026 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1026 2.75 11.9864 2.75C8.14808 2.75 4.85497 5.08106 3.44947 8.40278"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const UpdateIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M20 12A8 8 0 0 1 6.35 17.65" stroke="currentColor" stroke-linecap="round" />
    <path d="M4 12A8 8 0 0 1 17.65 6.35" stroke="currentColor" stroke-linecap="round" />
    <path d="M17.5 3.5V6.5H20.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6.5 20.5V17.5H3.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);
