package com.bank.notification.controller;

import com.bank.notification.service.Notification;
import com.bank.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Inspection endpoint only — lets you watch notifications land while demoing the flow. */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<Notification> all() {
        return notificationService.all();
    }
}
