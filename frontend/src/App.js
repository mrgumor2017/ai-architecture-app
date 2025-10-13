import React, { useState } from "react";
import { Container, Row, Col, Tabs, Tab, Toast, Spinner, Button, Card } from "react-bootstrap";
import DataForm from "./components/DataForm";
import FileUploader from "./components/FileUploader";
import ResultMatrix from "./components/ResultMatrix";
import api from "./api/api";

function App() {
  const [matrix, setMatrix] = useState(null);

  // toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastBg, setToastBg] = useState("success");

  // training spinner
  const [isTraining, setIsTraining] = useState(false);

  const handlePredict = async (numbers) => {
    try {
      const res = await api.post("/api/predict", { X_data: numbers });
      setMatrix(res.data.predicted);
    } catch (e) {
      setToastBg("danger");
      setToastMsg("Помилка передбачення: " + (e?.response?.data?.detail || e.message));
      setShowToast(true);
    }
  };

  const handleTrainJSON = async ({ X_data, Y_data, epochs = 300, lr = 0.001 }) => {
    setIsTraining(true);
    try {
      const res = await api.post("/api/train", { X_data, Y_data, epochs, lr });
      setToastBg("success");
      setToastMsg(`Навчання завершено. avg_loss=${res.data.avg_loss?.toFixed(6)}`);
      setShowToast(true);
    } catch (e) {
      setToastBg("danger");
      setToastMsg("Помилка навчання: " + (e?.response?.data?.detail || e.message));
      setShowToast(true);
    } finally {
      setIsTraining(false);
    }
  };

  const handleTrainFile = async ({ file, sheet, epochs = 600, lr = 0.001 }) => {
    setIsTraining(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (sheet) fd.append("sheet", sheet); // можна залишати пустим
      fd.append("epochs", epochs);
      fd.append("lr", lr);

      const res = await fetch("http://localhost:8000/api/train/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Upload/train error");
      }
      setToastBg("success");
      setToastMsg(`Файл натреновано. avg_loss=${Number(data.avg_loss).toFixed(6)}`);
      setShowToast(true);
    } catch (e) {
      setToastBg("danger");
      setToastMsg("Помилка навчання з файлу: " + e.message);
      setShowToast(true);
    } finally {
      setIsTraining(false);
    }
  };

  const handleResetModel = async () => {
    try {
      await api.post("/api/model/reset");
      setToastBg("warning");
      setToastMsg("Модель скинуто до початкового стану.");
      setShowToast(true);
    } catch (e) {
      setToastBg("danger");
      setToastMsg("Помилка скидання моделі: " + (e?.response?.data?.detail || e.message));
      setShowToast(true);
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <h2 className="mb-0">AI Generator: Архітектура сервісу</h2>
          <div className="text-muted">React + FastAPI + PyTorch</div>
        </Col>
        <Col xs="auto" className="d-flex align-items-center gap-2">
          {isTraining && (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" role="status" size="sm" />
              <span>Триває навчання…</span>
            </div>
          )}
          <Button variant="outline-warning" onClick={handleResetModel}>Скинути модель</Button>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <Tabs defaultActiveKey="manual" id="input-tabs" className="mb-3">
                <Tab eventKey="manual" title="Ручний ввід X">
                  <DataForm onPredictRequest={handlePredict} onTrainJSON={handleTrainJSON} />
                </Tab>
                <Tab eventKey="file" title="Файл (CSV/Excel)">
                  <FileUploader onTrainFile={handleTrainFile} />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <ResultMatrix matrix={matrix} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toast (плаваючий) */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1060 }}>
        <Toast onClose={() => setShowToast(false)} bg={toastBg} show={showToast} delay={4000} autohide>
          <Toast.Header closeButton={true}>
            <strong className="me-auto">Статус</strong>
            <small>щойно</small>
          </Toast.Header>
          <Toast.Body className={toastBg === "light" ? "" : "text-white"}>{toastMsg}</Toast.Body>
        </Toast>
      </div>
    </Container>
  );
}

export default App;
