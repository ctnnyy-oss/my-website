import React from "react";

/**
 * ErrorBoundary：把“白屏”变成“可读的报错面板”。
 * - 能捕获 React 渲染/生命周期中的错误
 * - 还能监听 window.onerror / unhandledrejection（部分非 React 错误）
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, extra: null };
    this._onError = null;
    this._onRejection = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
  }

  componentDidMount() {
    // 捕获 React 之外的错误（例如 async、某些第三方脚本）
    this._onError = (event) => {
      const err = event?.error || new Error(String(event?.message || event));
      this.setState({ hasError: true, error: err, extra: "window.onerror" });
    };

    this._onRejection = (event) => {
      const reason = event?.reason;
      const err = reason instanceof Error ? reason : new Error(String(reason));
      this.setState({ hasError: true, error: err, extra: "unhandledrejection" });
    };

    window.addEventListener("error", this._onError);
    window.addEventListener("unhandledrejection", this._onRejection);
  }

  componentWillUnmount() {
    if (this._onError) window.removeEventListener("error", this._onError);
    if (this._onRejection) window.removeEventListener("unhandledrejection", this._onRejection);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const error = this.state.error;
    const stack = error?.stack || "";
    const info = this.state.info?.componentStack || "";
    const extra = this.state.extra ? `（${this.state.extra}）` : "";

    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "24px",
          background: "linear-gradient(135deg, rgba(255,225,236,0.6), rgba(234,245,255,0.6))",
          color: "#2c1c1f",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(255,255,255,0.75)",
            borderRadius: 18,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#8B4F58" }}>
                页面出错啦 {extra}
              </div>
              <div style={{ marginTop: 6, color: "#A86B75", fontWeight: 700, fontSize: 13 }}>
                这不是你的问题～我把错误信息摊出来，方便我们定位。
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={btnStyle("#FF8FAB")}
              >
                刷新页面
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    // 清理 url 参数，避免参数导致重复进入错误路径
                    const u = new URL(window.location.href);
                    u.search = "";
                    window.location.href = u.toString();
                  } catch {
                    window.location.href = "/";
                  }
                }}
                style={btnStyle("#89CFF0")}
              >
                回到主页
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={labelStyle}>错误信息</div>
            <pre style={preStyle}>{String(error?.message || error || "Unknown error")}</pre>
          </div>

          {stack && (
            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Stack（堆栈）</div>
              <pre style={preStyle}>{stack}</pre>
            </div>
          )}

          {info && (
            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Component Stack（组件链）</div>
              <pre style={preStyle}>{info}</pre>
            </div>
          )}

          <div style={{ marginTop: 14, color: "#A86B75", fontWeight: 700, fontSize: 13 }}>
            你把这页截图发我就行（尤其是“错误信息/Stack”那块），我就能精准修。
          </div>
        </div>
      </div>
    );
  }
}

function btnStyle(color) {
  return {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.65)",
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
    color: "#2c1c1f",
    outline: `2px solid ${color}33`,
  };
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 900,
  color: "#8B4F58",
  marginBottom: 6,
};

const preStyle = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 14,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.45,
  color: "#2c1c1f",
};
