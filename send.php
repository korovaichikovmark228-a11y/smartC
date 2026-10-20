<?php
/**
 * Обработчик формы «Оставить заявку» (index.html#request).
 * Отправляет письмо на адрес из $TO и отвечает JSON {"ok": true|false}.
 *
 * Требования: PHP 7.4+ и настроенная отправка почты (функция mail()).
 * Если на сервере нет mail() — замените блок отправки на SMTP (например, PHPMailer)
 * или на отправку в CRM / Telegram-бота.
 */

header('Content-Type: application/json; charset=utf-8');

// ---- Настройки -------------------------------------------------------------
$TO      = 'info@icrosswalk.ru';                 // куда приходят заявки
$FROM    = 'noreply@icrosswalk.ru';              // адрес отправителя (должен быть на домене сайта)
$SUBJECT = 'Заявка с сайта icrosswalk.ru';
// ---------------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

// Скрытое поле-ловушка для ботов: люди его не видят и не заполняют
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function field(string $name, int $max = 200): string {
    $v = trim((string)($_POST[$name] ?? ''));
    $v = str_replace(["\r", "\n"], ' ', $v);           // защита от подмены заголовков
    return mb_substr(strip_tags($v), 0, $max, 'UTF-8');
}

$company = field('company');
$name    = field('name');
$phone   = field('phone', 40);
$email   = field('email', 120);
$page    = field('page', 60);

if ($company === '' || $name === '' || strlen(preg_replace('/\D/', '', $phone)) < 10) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $email = '';
}

$body  = "Новая заявка с сайта\n\n";
$body .= "Компания: {$company}\n";
$body .= "Ф.И.О.: {$name}\n";
$body .= "Телефон: {$phone}\n";
$body .= "Email: " . ($email !== '' ? $email : '—') . "\n";
$body .= "Страница: " . ($page !== '' ? $page : '—') . "\n";
$body .= "Дата: " . date('d.m.Y H:i') . "\n";
$body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? '—') . "\n";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "From: SmartC <{$FROM}>\r\n";
if ($email !== '') {
    $headers .= "Reply-To: {$email}\r\n";
}

$subject = '=?UTF-8?B?' . base64_encode($SUBJECT) . '?=';
$ok = @mail($TO, $subject, $body, $headers, '-f' . $FROM);

if (!$ok) {
    http_response_code(500);
}
echo json_encode(['ok' => (bool)$ok]);
